// 카카오 JavaScript SDK 로더 + 인가 요청 래퍼.
// 모바일에서 카카오톡 앱이 설치돼 있으면 앱으로 전환해 인증한다(throughTalk).
// 미설치 / 데스크톱이면 kauth.kakao.com 웹 로그인 페이지로 자동 폴백된다.

type KakaoAuth = {
  authorize: (params: { redirectUri: string; throughTalk?: boolean; state?: string }) => void;
};

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Auth: KakaoAuth;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

let loadingPromise: Promise<KakaoSdk> | null = null;

function loadScript(): Promise<KakaoSdk> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kakao SDK requires browser'));
  }
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Kakao) resolve(window.Kakao);
        else reject(new Error('Kakao SDK load failed'));
      });
      existing.addEventListener('error', () => reject(new Error('Kakao SDK load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.kakaoSdk = 'true';
    script.onload = () => {
      if (window.Kakao) resolve(window.Kakao);
      else reject(new Error('Kakao SDK load failed'));
    };
    script.onerror = () => reject(new Error('Kakao SDK load failed'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export async function authorizeWithKakao(opts: {
  jsKey: string;
  redirectUri: string;
  /** true: 모바일에서 카카오톡 앱으로 인증 / false: kauth.kakao.com 웹 계정 입력 */
  throughTalk?: boolean;
}): Promise<void> {
  const sdk = await loadScript();
  if (!sdk.isInitialized()) sdk.init(opts.jsKey);
  sdk.Auth.authorize({
    redirectUri: opts.redirectUri,
    throughTalk: opts.throughTalk ?? false,
  });
}
