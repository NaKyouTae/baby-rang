'use client';

import { useCallback, useState } from 'react';
import {
  isKakaoNativeLoginAvailable,
  runKakaoNativeLogin,
} from '@/lib/kakaoNativeLogin';
import {
  isNaverNativeLoginAvailable,
  runNaverNativeLogin,
} from '@/lib/naverNativeLogin';
import { isNativeApp } from '@/lib/isNativeApp';
import { markPendingLoginProvider, type LoginProvider } from '@/lib/lastLoginProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

const FALLBACK_ERROR = '로그인을 완료하지 못했어요. 다시 시도해 주세요.';
const OUTDATED_APP_ERROR = '앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.';

// 로그인 모달과 /login 페이지가 함께 쓰는 소셜 로그인 흐름.
// 버튼 모양은 화면마다 달라도 동작은 한 벌이어야 한쪽만 고치는 사고가 나지 않는다.
//
// onLeave: 로그인이 끝났거나 웹 OAuth 로 페이지를 떠날 때 불린다(모달 닫기 등).
export function useSocialLogin(onLeave?: () => void) {
  // 네이티브 로그인이 진행 중인지. 카카오톡/네이버 앱으로 전환된 동안 중복 탭을 막는다.
  const [loading, setLoading] = useState<LoginProvider | null>(null);
  // 네이티브 로그인이 실패한 이유. 앱에서는 웹 OAuth 로 넘기지 않으므로
  // 실패를 화면에 남겨야 한다(그러지 않으면 버튼이 아무 반응 없는 것처럼 보인다).
  const [error, setError] = useState<{ provider: LoginProvider; message: string } | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const login = useCallback(
    (provider: LoginProvider) => {
      if (loading) return;
      setError(null);
      markPendingLoginProvider(provider);

      // Apple 은 네이티브 브릿지 없이 항상 웹 OAuth 다.
      if (provider === 'apple') {
        onLeave?.();
        window.location.href = `${API_URL}/auth/apple`;
        return;
      }

      const native =
        provider === 'kakao'
          ? { available: isKakaoNativeLoginAvailable(), run: runKakaoNativeLogin }
          : { available: isNaverNativeLoginAvailable(), run: runNaverNativeLogin };

      // 앱에 브릿지가 있으면 카카오톡/네이버 앱으로 인증한다.
      if (native.available) {
        setLoading(provider);
        void native
          .run()
          .then((done) => {
            // done=false 는 사용자가 앱에서 취소한 경우. 화면을 그대로 둔다.
            if (done) onLeave?.();
            setLoading(null);
          })
          .catch((e) => {
            // ⚠️ 앱에서는 웹 OAuth 로 되돌리지 않는다.
            //    웹 로그인은 로그인이 끝나면 우리 홈으로 리다이렉트하는데,
            //    그 흐름은 WebView 밖(브라우저)에서 끝나거나 WebView 안에서
            //    네이티브 세션과 어긋나, 사용자는 "웹으로 넘어가서 앱으로
            //    돌아오지 못하는" 상태에 놓인다. 실패는 실패로 알리고
            //    다시 시도하게 하는 쪽이 낫다.
            console.error(`[${provider}] 네이티브 로그인 실패:`, e);
            // 서버가 이유를 준 경우(동의 항목 부족 등)에는 그대로 보여준다.
            // 일반 문구로 덮으면 사용자가 무엇을 고쳐야 할지 알 수 없다.
            setError({
              provider,
              message: e instanceof Error && e.message ? e.message : FALLBACK_ERROR,
            });
            setLoading(null);
          });
        return;
      }

      // 브릿지가 없는데 앱 안이라면 로그인이 빠진 구 빌드다.
      // 이때도 웹 OAuth 로 보내면 안 된다(앱으로 돌아오지 못한다).
      if (isNativeApp()) {
        setError({ provider, message: OUTDATED_APP_ERROR });
        return;
      }

      // 여기까지 오면 브라우저로 접속한 경우다. 웹 OAuth 는 이때만 쓴다.
      onLeave?.();
      window.location.href = `${API_URL}/auth/${provider}`;
    },
    [loading, onLeave],
  );

  return { login, loading, error, resetError };
}
