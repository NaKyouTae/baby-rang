'use client';

// 네이티브 앱에서 카카오톡 앱 로그인을 돌린다.
//
// 웹 로그인은 /auth/kakao 로 리다이렉트해 카카오 웹 로그인 페이지를 거치는데,
// 앱에서는 카카오톡이 깔려 있으면 앱으로 넘어가 인증하는 쪽이 자연스럽다.
// WebView 안의 웹은 카카오 SDK 를 직접 부를 수 없으므로, 네이티브가 등록한
// 메시지 핸들러로 요청을 보내고 결과를 돌려받는다.
// (ios/BabyRang/BabyRang/KakaoLoginBridge.swift 와 짝을 이룬다)
//
// 브릿지가 없는 구 빌드·웹 브라우저에서는 기존 웹 OAuth 로 그대로 간다.

interface BridgeWindow extends Window {
  webkit?: {
    messageHandlers?: Record<string, { postMessage: (body: unknown) => void }>;
  };
  __kakaoLoginBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

type BridgeResponse =
  | { ok: true; accessToken: string }
  | { ok: false; cancelled?: boolean; message?: string };

function bridge(): BridgeWindow['webkit'] | null {
  if (typeof window === 'undefined') return null;
  const w = window as BridgeWindow;
  return w.webkit?.messageHandlers?.kakaoLogin ? w.webkit : null;
}

/** 네이티브 카카오 로그인을 쓸 수 있는지. 없으면 웹 OAuth 로 가야 한다. */
export function isKakaoNativeLoginAvailable(): boolean {
  return bridge() !== null;
}

let seq = 0;
const pending = new Map<string, (payload: BridgeResponse) => void>();

/**
 * 카카오톡(또는 카카오계정)으로 로그인하고 카카오 access token 을 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 *
 * ⚠️ 타임아웃을 걸지 않는다. 사용자가 카카오톡으로 전환해 동의 화면을 보는 동안
 * 얼마든지 시간이 걸릴 수 있고, 여기서 reject 해도 네이티브 쪽 로그인은 계속 진행된다.
 * 네이티브는 모든 경로에서 반드시 응답을 돌려준다.
 */
export function loginWithKakaoNative(): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    const webkit = bridge();
    const target = webkit?.messageHandlers?.kakaoLogin;
    if (!target) {
      reject(new Error('카카오 로그인을 사용할 수 없습니다.'));
      return;
    }

    const w = window as BridgeWindow;
    if (!w.__kakaoLoginBridge) {
      // 네이티브가 결과를 돌려줄 창구. 모듈이 여러 번 로드돼도 하나만 만든다.
      w.__kakaoLoginBridge = {
        resolve(requestId, payload) {
          const fn = pending.get(requestId);
          if (!fn) return;
          pending.delete(requestId);
          fn(payload);
        },
      };
    }

    const requestId = `kakao-${++seq}-${Date.now()}`;
    pending.set(requestId, (payload) => {
      if (payload.ok) {
        resolve(payload.accessToken);
        return;
      }
      if (payload.cancelled) {
        resolve(null);
        return;
      }
      reject(new Error(payload.message ?? '로그인을 완료하지 못했습니다.'));
    });
    target.postMessage({ requestId });
  });
}

/**
 * 네이티브 카카오 로그인 전체 흐름.
 *
 * 카카오 토큰을 받아 서버에서 우리 토큰으로 바꾼 뒤, /api/auth/session 으로
 * **navigation** 해서 쿠키를 심는다. fetch 응답의 Set-Cookie 를 WKWebView 가
 * 영속화하지 못하는 경우가 있어, 세션 확립은 반드시 navigation 으로 해야 한다.
 *
 * 사용자가 취소하면 false 를 돌려준다(화면을 그대로 두면 된다).
 */
export async function runKakaoNativeLogin(): Promise<boolean> {
  const kakaoToken = await loginWithKakaoNative();
  if (!kakaoToken) return false;

  const res = await fetch('/api/auth/kakao/native', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: kakaoToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? '로그인에 실패했습니다.');
  }

  if (data.accessToken) {
    window.location.href = `/api/auth/session?token=${encodeURIComponent(data.accessToken)}`;
    return true;
  }
  if (data.signupToken) {
    window.location.href = `/api/auth/session?signupToken=${encodeURIComponent(data.signupToken)}`;
    return true;
  }
  throw new Error('로그인에 실패했습니다.');
}
