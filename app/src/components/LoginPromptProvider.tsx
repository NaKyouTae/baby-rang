'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';
import { useAppOverlayLock } from './ads/appOverlay';
import {
  isKakaoNativeLoginAvailable,
  runKakaoNativeLogin,
} from '@/lib/kakaoNativeLogin';
import {
  isNaverNativeLoginAvailable,
  runNaverNativeLogin,
} from '@/lib/naverNativeLogin';
import { isNativeApp } from '@/lib/isNativeApp';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

type LoginPromptContextValue = {
  /** Returns true if already logged in. Otherwise opens the login prompt and returns false. */
  requireLogin: (message?: string) => boolean;
  openLoginPrompt: (message?: string) => void;
};

const LoginPromptContext = createContext<LoginPromptContextValue | null>(null);

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error('useLoginPrompt must be used within LoginPromptProvider');
  return ctx;
}

export default function LoginPromptProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  // 로그인 시트가 열려 있는 동안 네이티브 앱 배너를 숨긴다.
  useAppOverlayLock(open);
  const [message, setMessage] = useState<string | undefined>(undefined);
  // 네이티브 카카오 로그인이 진행 중인지. 카카오톡으로 전환된 동안 중복 탭을 막는다.
  const [kakaoLoading, setKakaoLoading] = useState(false);
  // 네이티브 카카오 로그인이 실패한 이유. 앱에서는 웹 OAuth 로 넘기지 않으므로
  // 실패를 화면에 남겨야 한다(그러지 않으면 버튼이 아무 반응 없는 것처럼 보인다).
  const [kakaoError, setKakaoError] = useState<string | null>(null);
  // 네이버도 카카오와 같다 — 앱에서는 웹 OAuth 로 되돌릴 수 없어 실패를 화면에 남긴다.
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverError, setNaverError] = useState<string | null>(null);
  // 애플 로그인 / 계정으로 로그인 미사용 (주석 처리)
  // const [testFormOpen, setTestFormOpen] = useState(false);
  // const [testUsername, setTestUsername] = useState('');
  // const [testPassword, setTestPassword] = useState('');
  // const [testLoading, setTestLoading] = useState(false);
  // const [testError, setTestError] = useState<string | null>(null);

  const openLoginPrompt = useCallback((msg?: string) => {
    setMessage(msg);
    setOpen(true);
    setKakaoError(null);
    setNaverError(null);
    // setTestFormOpen(false);
    // setTestError(null);
  }, []);

  // 계정으로 로그인 미사용 (주석 처리)
  //   const handleTestLogin = useCallback(async () => {
  //     if (testLoading) return;
  //     setTestLoading(true);
  //     setTestError(null);
  //     try {
  //       const res = await fetch('/api/auth/test-login', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ username: testUsername, password: testPassword }),
  //       });
  //       const data = await res.json().catch(() => ({}));
  //       if (!res.ok || !data.accessToken) {
  //         setTestError('아이디 또는 비밀번호가 올바르지 않습니다.');
  //         return;
  //       }
  //       // 쿠키는 session 라우트가 navigation 응답으로 설정 (WKWebView 영속화 대응)
  //       window.location.href = `/api/auth/session?token=${encodeURIComponent(data.accessToken)}`;
  //     } catch {
  //       setTestError('로그인 중 오류가 발생했어요.');
  //     } finally {
  //       setTestLoading(false);
  //     }
  //   }, [testUsername, testPassword, testLoading]);

  const requireLogin = useCallback(
    (msg?: string) => {
      if (isAuthenticated) return true;
      openLoginPrompt(msg);
      return false;
    },
    [isAuthenticated, openLoginPrompt],
  );

  return (
    <LoginPromptContext.Provider value={{ requireLogin, openLoginPrompt }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" style={{ padding: '0 24px' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-[8px] bg-white p-4 shadow-xl" style={{ maxWidth: 'calc(430px - 48px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-center rounded-[30px] bg-gray-100" style={{ width: 60, height: 60 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25.6667 16C25.6667 13.4363 24.6479 10.9778 22.8351 9.16494C21.0222 7.35209 18.5638 6.33334 16 6.33334C15.4477 6.33334 15 5.88563 15 5.33334C15 4.78106 15.4477 4.33334 16 4.33334C19.0942 4.33334 22.0621 5.56209 24.25 7.75001C26.4379 9.93793 27.6667 12.9058 27.6667 16C27.6667 19.0942 26.4379 22.0621 24.25 24.25C22.0621 26.4379 19.0942 27.6667 16 27.6667C15.4477 27.6667 15 27.219 15 26.6667C15 26.1144 15.4477 25.6667 16 25.6667C18.5638 25.6667 21.0222 24.6479 22.8351 22.8351C24.6479 21.0222 25.6667 18.5638 25.6667 16Z" fill="black" />
                  <path d="M13.9591 11.2926C14.3496 10.902 14.9835 10.902 15.3741 11.2926L19.3741 15.2926C19.7646 15.6831 19.7646 16.317 19.3741 16.7075L15.3741 20.7075C14.9835 21.098 14.3496 21.098 13.9591 20.7075C13.5686 20.317 13.5686 19.6831 13.9591 19.2926L16.2517 17H5.33325C4.78097 17 4.33325 16.5523 4.33325 16C4.33325 15.4477 4.78097 15 5.33325 15H16.2517L13.9591 12.7075C13.5686 12.317 13.5686 11.6831 13.9591 11.2926Z" fill="black" />
                </svg>
              </div>
            </div>
            <h3 className="text-center font-medium text-black" style={{ fontSize: 16 }}>
              육아 동반자 아기랑과 함께해요 !
            </h3>
            <p className="text-center font-medium leading-relaxed" style={{ fontSize: 12, color: palette.gray500, marginTop: 8 }}>
              {message ?? '로그인하고 편리한 맞춤 육아를 시작해 보세요.'}
            </p>
            <div className="flex flex-col" style={{ marginTop: 16, gap: 8 }}>
              <button
                type="button"
                disabled={kakaoLoading}
                onClick={() => {
                  setKakaoError(null);
                  setNaverError(null);

                  // 앱에 브릿지가 있으면 카카오톡 앱으로 인증한다.
                  if (isKakaoNativeLoginAvailable()) {
                    setKakaoLoading(true);
                    void runKakaoNativeLogin()
                      .then((done) => {
                        // done=false 는 사용자가 카카오톡에서 취소한 경우. 시트를 그대로 둔다.
                        if (done) setOpen(false);
                        setKakaoLoading(false);
                      })
                      .catch((e) => {
                        // ⚠️ 앱에서는 웹 OAuth 로 되돌리지 않는다.
                        //    카카오 웹 로그인은 로그인이 끝나면 우리 홈으로 리다이렉트하는데,
                        //    그 흐름은 WebView 밖(브라우저)에서 끝나거나 WebView 안에서
                        //    네이티브 세션과 어긋나, 사용자는 "웹으로 넘어가서 앱으로
                        //    돌아오지 못하는" 상태에 놓인다. 실패는 실패로 알리고
                        //    카카오톡으로 다시 시도하게 하는 쪽이 낫다.
                        console.error('[kakao] 네이티브 로그인 실패:', e);
                        // 서버가 이유를 준 경우(동의 항목 부족 등)에는 그대로 보여준다.
                        // 일반 문구로 덮으면 사용자가 무엇을 고쳐야 할지 알 수 없다.
                        setKakaoError(
                          e instanceof Error && e.message
                            ? e.message
                            : '로그인을 완료하지 못했어요. 다시 시도해 주세요.',
                        );
                        setKakaoLoading(false);
                      });
                    return;
                  }

                  // 브릿지가 없는데 앱 안이라면 카카오 로그인이 빠진 구 빌드다.
                  // 이때도 웹 OAuth 로 보내면 안 된다(앱으로 돌아오지 못한다).
                  if (isNativeApp()) {
                    setKakaoError('앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.');
                    return;
                  }

                  // 여기까지 오면 브라우저로 접속한 경우다. 웹 카카오 로그인은 이때만 쓴다.
                  setOpen(false);
                  window.location.href = `${API_URL}/auth/kakao`;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] font-semibold active:opacity-80 disabled:opacity-60"
                style={{ height: 40, fontSize: 14, backgroundColor: '#FEE500', color: '#191919' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
                  <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.7-.2.7-.7 2.7-.8 3.1-.1.5.2.5.4.4.2-.1 2.7-1.8 3.7-2.5.6.1 1.2.1 1.9.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
                </svg>
                {kakaoLoading ? '카카오톡으로 이동 중' : '카카오로 시작하기'}
              </button>
              {kakaoError && (
                <p
                  role="alert"
                  className="text-center font-medium leading-relaxed"
                  style={{ fontSize: 12, color: palette.red }}
                >
                  {kakaoError}
                </p>
              )}
              {/* 네이버 로그인. 카카오와 완전히 같은 흐름이다 —
                  앱이면 네이티브 브릿지, 브라우저면 웹 OAuth. */}
              <button
                type="button"
                disabled={naverLoading}
                onClick={() => {
                  setKakaoError(null);
                  setNaverError(null);

                  if (isNaverNativeLoginAvailable()) {
                    setNaverLoading(true);
                    void runNaverNativeLogin()
                      .then((done) => {
                        if (done) setOpen(false);
                        setNaverLoading(false);
                      })
                      .catch((e) => {
                        console.error('[naver] 네이티브 로그인 실패:', e);
                        // 서버가 이유를 준 경우(동의 항목 부족 등)에는 그대로 보여준다.
                        // 일반 문구로 덮으면 사용자가 무엇을 고쳐야 할지 알 수 없다.
                        setNaverError(
                          e instanceof Error && e.message
                            ? e.message
                            : '로그인을 완료하지 못했어요. 다시 시도해 주세요.',
                        );
                        setNaverLoading(false);
                      });
                    return;
                  }

                  // 앱인데 브릿지가 없으면 네이버 로그인이 빠진 구 빌드다.
                  // 웹 OAuth 로 보내면 앱으로 돌아오지 못하므로 업데이트를 안내한다.
                  if (isNativeApp()) {
                    setNaverError('앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.');
                    return;
                  }

                  setOpen(false);
                  window.location.href = `${API_URL}/auth/naver`;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] font-semibold active:opacity-80 disabled:opacity-60"
                style={{ height: 40, fontSize: 14, backgroundColor: '#03C75A', color: '#FFFFFF' }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="#FFFFFF" aria-hidden="true">
                  <path d="M11.6 10.7 8.2 5.8H5.3v8.4h3.1V9.3l3.4 4.9h2.9V5.8h-3.1v4.9z" />
                </svg>
                {naverLoading ? '네이버로 이동 중' : '네이버로 시작하기'}
              </button>
              {naverError && (
                <p
                  role="alert"
                  className="text-center font-medium leading-relaxed"
                  style={{ fontSize: 12, color: palette.red }}
                >
                  {naverError}
                </p>
              )}
              {/* Apple 심사 가이드라인 4.8: 서드파티 로그인(카카오)을 제공하면
                  개인정보 보호형 로그인도 함께 제공해야 한다.
                  이 버튼을 빼면 4.8 위반으로 심사에서 거절된다. */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.href = `${API_URL}/auth/apple`;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] font-semibold active:opacity-80"
                style={{ height: 40, fontSize: 14, backgroundColor: '#000000', color: '#FFFFFF' }}
              >
                <svg width="14" height="16" viewBox="0 0 384 512" fill="#FFFFFF" aria-hidden="true">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                Apple로 로그인
              </button>
              {/* 계정으로 로그인 미사용 (주석 처리)
              <button
                type="button"
                onClick={() => setTestFormOpen((v) => !v)}
                className="w-full rounded-[4px] border border-gray-300 bg-white font-semibold active:bg-gray-100"
                style={{ height: 40, fontSize: 14, color: palette.gray600 }}
              >
                계정으로 로그인
              </button>
              {testFormOpen && (
                <div className="flex flex-col" style={{ gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    placeholder="아이디"
                    autoComplete="username"
                    className="w-full rounded-[4px] border border-gray-300 px-3"
                    style={{ height: 36, fontSize: 13 }}
                  />
                  <input
                    type="password"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTestLogin();
                    }}
                    className="w-full rounded-[4px] border border-gray-300 px-3"
                    style={{ height: 36, fontSize: 13 }}
                  />
                  {testError && (
                    <p className="text-[11px]" style={{ color: '#DC2626' }}>
                      {testError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleTestLogin}
                    disabled={testLoading || !testUsername || !testPassword}
                    className="w-full rounded-[4px] font-semibold active:opacity-80 disabled:opacity-50"
                    style={{ height: 36, fontSize: 13, backgroundColor: '#3078C9', color: '#FFFFFF' }}
                  >
                    {testLoading ? '로그인 중...' : '로그인'}
                  </button>
                </div>
              )}
              */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-[4px] bg-gray-200 font-semibold active:bg-gray-300"
                style={{ height: 40, fontSize: 14, color: palette.gray500 }}
              >
                나중에
              </button>
            </div>

            {/* 약관 고지.
                가입 화면을 없애면서 앱에서 약관 동의를 받는 단계가 사라졌다.
                카카오는 간편가입 동의 화면에서 약관 동의를 받아오지만, 네이버는
                약관 동의 기능 자체가 없어 받아올 값이 없다. 그래서 이 고지가
                네이버 가입자의 필수 약관 동의 근거가 된다 — 지우면 안 된다. */}
            <p
              className="text-center leading-relaxed"
              style={{ fontSize: 11, color: palette.gray400, marginTop: 12 }}
            >
              로그인하면{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: palette.gray500 }}
              >
                이용약관
              </Link>
              {' 및 '}
              <Link
                href="/settings/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: palette.gray500 }}
              >
                개인정보처리방침
              </Link>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>
      )}
    </LoginPromptContext.Provider>
  );
}
