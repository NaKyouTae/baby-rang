'use client';

// 네이티브 앱에서 카카오톡 앱 로그인을 돌린다.
//
// 웹 로그인은 /auth/kakao 로 리다이렉트해 카카오 웹 로그인 페이지를 거치는데,
// 앱에서는 카카오톡이 깔려 있으면 앱으로 넘어가 인증하는 쪽이 자연스럽다.
// WebView 안의 웹은 카카오 SDK 를 직접 부를 수 없으므로, 네이티브가 등록한
// 메시지 핸들러로 요청을 보내고 결과를 돌려받는다.
// (ios/.../KakaoLoginBridge.swift, android/.../KakaoLoginManager.kt 와 짝을 이룬다)
//
// iOS 는 webkit.messageHandlers, Android 는 window.Android 로 창구가 다르지만
// 응답은 양쪽 모두 window.__kakaoLoginBridge.resolve 로 돌아온다.
//
// 브릿지가 없는 구 빌드·웹 브라우저에서는 기존 웹 OAuth 로 그대로 간다.

interface BridgeWindow extends Window {
  webkit?: {
    messageHandlers?: Record<string, { postMessage: (body: unknown) => void }>;
  };
  Android?: { kakaoLogin?: (json: string) => void };
  __kakaoLoginBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

type BridgeResponse =
  | { ok: true; accessToken: string }
  // detail 은 네이티브가 넘기는 원인 문자열(카카오 SDK 에러). 사용자에게 보이지 않고
  // 로그로만 쓴다 — 실패하면 웹 OAuth 로 되돌아가므로 흔적이 남지 않는다.
  | { ok: false; cancelled?: boolean; message?: string; detail?: string };

/**
 * 네이티브에 요청을 보내는 함수를 돌려준다. 브릿지가 없으면 null.
 *
 * 핸들러의 존재가 곧 "이 빌드는 카카오 네이티브 로그인이 들어간 버전"이라는 뜻이라,
 * 이 한 줄로 플랫폼 분기와 버전 분기가 같이 해결된다. 구 빌드에서는 null 이 되어
 * 호출하는 쪽이 기존 웹 OAuth 로 넘어간다.
 */
function bridge(): ((requestId: string) => void) | null {
  if (typeof window === 'undefined') return null;
  const w = window as BridgeWindow;

  const ios = w.webkit?.messageHandlers?.kakaoLogin;
  if (ios) return (requestId) => ios.postMessage({ requestId });

  const android = w.Android?.kakaoLogin;
  // ⚠️ @JavascriptInterface 는 JS 객체를 못 받는다. JSON 문자열로 넘긴다.
  //    수신 객체(window.Android)를 유지한 채 호출해야 한다.
  if (typeof android === 'function') {
    return (requestId) => w.Android?.kakaoLogin?.(JSON.stringify({ requestId }));
  }

  return null;
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
    const send = bridge();
    if (!send) {
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
      if (payload.detail) {
        console.error('[kakao] 네이티브 로그인 실패:', payload.detail);
      }
      reject(new Error(payload.message ?? '로그인을 완료하지 못했습니다.'));
    });
    send(requestId);
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

  if (!data.accessToken) {
    throw new Error('로그인에 실패했습니다.');
  }
  window.location.href = `/api/auth/session?token=${encodeURIComponent(data.accessToken)}`;
  return true;
}
