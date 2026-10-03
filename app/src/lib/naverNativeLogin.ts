'use client';

// 네이티브 앱에서 네이버 앱 로그인을 돌린다.
//
// 구조는 카카오(kakaoNativeLogin.ts)와 같다. 웹에서는 /auth/naver 리다이렉트로
// 네이버 웹 로그인을 거치지만, 앱에서는 네이버 SDK 가 네이버앱으로 인증한다.
// (ios/.../NaverLoginBridge.swift, android/.../NaverLoginManager.kt 와 짝)
//
// 카카오와 다른 점은 토큰을 두 개 받는다는 것이다. 네이버에는 "이 토큰이 우리 앱
// 것인가"를 되묻는 API 가 없어서, 서버가 refresh token 을 우리 client_id·secret 으로
// 갱신해 보는 방식으로 대신 확인한다(server/src/auth/naver.service.ts).
// 그래서 네이티브가 refresh token 까지 올려줘야 한다.

interface BridgeWindow extends Window {
  webkit?: {
    messageHandlers?: Record<string, { postMessage: (body: unknown) => void }>;
  };
  Android?: { naverLogin?: (json: string) => void };
  __naverLoginBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

type BridgeResponse =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; cancelled?: boolean; message?: string; detail?: string };

function bridge(): ((requestId: string) => void) | null {
  if (typeof window === 'undefined') return null;
  const w = window as BridgeWindow;

  const ios = w.webkit?.messageHandlers?.naverLogin;
  if (ios) return (requestId) => ios.postMessage({ requestId });

  const android = w.Android?.naverLogin;
  // ⚠️ @JavascriptInterface 는 JS 객체를 못 받는다. JSON 문자열로 넘긴다.
  if (typeof android === 'function') {
    return (requestId) => w.Android?.naverLogin?.(JSON.stringify({ requestId }));
  }

  return null;
}

/** 네이티브 네이버 로그인을 쓸 수 있는지. 없으면 웹 OAuth 로 가야 한다. */
export function isNaverNativeLoginAvailable(): boolean {
  return bridge() !== null;
}

let seq = 0;
const pending = new Map<string, (payload: BridgeResponse) => void>();

/**
 * 네이버앱(또는 네이버 계정)으로 로그인하고 토큰을 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 *
 * ⚠️ 타임아웃을 걸지 않는다 — 카카오와 같은 이유다. 네이티브는 모든 경로에서
 * 반드시 응답을 돌려주므로 Promise 는 반드시 풀린다.
 */
export function loginWithNaverNative(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  return new Promise((resolve, reject) => {
    const send = bridge();
    if (!send) {
      reject(new Error('네이버 로그인을 사용할 수 없습니다.'));
      return;
    }

    const w = window as BridgeWindow;
    if (!w.__naverLoginBridge) {
      w.__naverLoginBridge = {
        resolve(requestId, payload) {
          const fn = pending.get(requestId);
          if (!fn) return;
          pending.delete(requestId);
          fn(payload);
        },
      };
    }

    const requestId = `naver-${++seq}-${Date.now()}`;
    pending.set(requestId, (payload) => {
      if (payload.ok) {
        resolve({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        });
        return;
      }
      if (payload.cancelled) {
        resolve(null);
        return;
      }
      if (payload.detail) {
        console.error('[naver] 네이티브 로그인 실패:', payload.detail);
      }
      reject(new Error(payload.message ?? '로그인을 완료하지 못했습니다.'));
    });
    send(requestId);
  });
}

/**
 * 네이티브 네이버 로그인 전체 흐름.
 *
 * 받은 토큰을 서버에서 우리 토큰으로 바꾼 뒤 /api/auth/session 으로 **navigation**
 * 해서 쿠키를 심는다(WKWebView 가 fetch 응답의 Set-Cookie 를 영속화하지 못하는 경우 대응).
 *
 * 사용자가 취소하면 false 를 돌려준다.
 */
export async function runNaverNativeLogin(): Promise<boolean> {
  const tokens = await loginWithNaverNative();
  if (!tokens) return false;

  const res = await fetch('/api/auth/naver/native', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? '로그인에 실패했습니다.');
  }

  if (!data.accessToken) {
    throw new Error('로그인에 실패했습니다.');
  }
  window.location.href = `/api/auth/session?token=${encodeURIComponent(data.accessToken)}`;
  return true;
}
