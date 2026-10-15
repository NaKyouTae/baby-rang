'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocialLogin } from '@/hooks/useSocialLogin';
import { getLastLoginProvider, type LoginProvider } from '@/lib/lastLoginProvider';
import { palette } from '@/lib/colors';

// 로그인/회원가입 진입 전용 화면.
//
// 카카오·네이버 심사는 "회원가입 화면 링크"를 요구하고, 심사자가 주소를 열었을 때
// 로그인 수단이 바로 보여야 한다. 버튼 모양은 모달과 다르지만 동작은
// useSocialLogin 한 벌을 같이 쓴다 — 심사자가 누르는 버튼과 실제 사용자가 누르는
// 버튼이 다르게 동작하면 안 된다.

// 상단 쪽쪽이 줄. 두 번째만 켜진 모습이 디자인이다.
const PACIFIERS = [false, true, false, false, false, false, false];

const BUTTONS: {
  provider: LoginProvider;
  label: string;
  loadingLabel: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    provider: 'kakao',
    label: '카카오로 계속하기',
    loadingLabel: '카카오톡으로 이동 중',
    bg: '#FEE500',
    color: palette.black,
    // eslint-disable-next-line @next/next/no-img-element
    icon: <img src="/login/kakao.svg" alt="" width={24} height={24} />,
  },
  {
    provider: 'naver',
    label: '네이버로 계속하기',
    loadingLabel: '네이버로 이동 중',
    bg: '#03A94D',
    color: palette.white,
    // eslint-disable-next-line @next/next/no-img-element
    icon: <img src="/login/naver.svg" alt="" width={24} height={24} />,
  },
  {
    // Apple 심사 가이드라인 4.8: 서드파티 로그인(카카오)을 제공하면
    // 개인정보 보호형 로그인도 함께 제공해야 한다. 빼면 심사에서 거절된다.
    provider: 'apple',
    label: 'Apple로 계속하기',
    loadingLabel: 'Apple로 계속하기',
    bg: '#000000',
    color: palette.white,
    icon: (
      <svg width="24" height="24" viewBox="-64 -32 512 576" fill="#FFFFFF" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
    ),
  },
];

// 저장소 값은 이 화면에 있는 동안 바뀌지 않으므로 구독할 것이 없다.
// 서버 렌더에서는 null 이라 말풍선 없이 그리고, 하이드레이션 뒤에 붙는다.
const noopSubscribe = () => () => {};

export default function LoginClient() {
  const router = useRouter();
  const { isAuthenticated, isLoaded } = useAuth();
  const { login, loading, error } = useSocialLogin();
  const lastProvider = useSyncExternalStore(noopSubscribe, getLastLoginProvider, () => null);

  useEffect(() => {
    // 이미 로그인한 사람에게 로그인 화면을 보여줄 이유가 없다.
    if (isLoaded && isAuthenticated) router.replace('/home');
  }, [isLoaded, isAuthenticated, router]);

  return (
    <div
      className="flex min-h-dvh flex-col items-center gap-[24px] overflow-x-hidden px-[20px]"
      style={{
        backgroundColor: palette.white,
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        paddingBottom: 'calc(var(--safe-area-bottom) + 20px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      {/* 로그인 화면은 앱 진입 전 단계라 하단 탭을 보여주지 않는다. */}
      <style>{`[data-bottom-nav-root]{display:none !important}`}</style>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-[24px] pt-[36px]">
        {/* 화면보다 넓은 줄을 가운데 정렬해 양 끝이 잘려 보이게 한다. */}
        <div className="flex items-center justify-center gap-[20px]" aria-hidden="true">
          {PACIFIERS.map((on, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={on ? '/login/pacifier-on.png' : '/login/pacifier-off.png'}
              alt=""
              className="shrink-0 object-contain"
              style={{ width: on ? 64 : 40, height: on ? 64 : 40 }}
            />
          ))}
        </div>
        <h1 className="text-center text-[16px] leading-none font-normal" style={{ color: palette.black }}>
          기록으로 완성하는 육아 성장 퀘스트, 아기랑
        </h1>
      </div>

      <div className="flex w-full flex-col gap-[8px]">
        {BUTTONS.map((b) => (
          <div key={b.provider} className="relative">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => login(b.provider)}
              className="flex h-[52px] w-full items-center gap-[10px] rounded-[8px] px-[20px] active:opacity-80 disabled:opacity-60"
              style={{ backgroundColor: b.bg, color: b.color }}
            >
              <span className="flex size-[24px] shrink-0 items-center justify-center">{b.icon}</span>
              <span className="flex-1 text-center text-[16px] leading-none">
                {loading === b.provider ? b.loadingLabel : b.label}
              </span>
            </button>

            {lastProvider === b.provider && (
              <div
                className="pointer-events-none absolute right-[8px] flex flex-col items-center"
                style={{ top: -32 }}
              >
                <span
                  className="rounded-full px-[12px] py-[8px] text-[12px] leading-none whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(18,18,18,0.8)', color: palette.white }}
                >
                  최근 로그인
                </span>
                <svg width="13" height="11" viewBox="0 0 13 11" aria-hidden="true">
                  <path d="M0 0H13L6.5 11Z" fill="rgba(18,18,18,0.8)" />
                </svg>
              </div>
            )}

            {error?.provider === b.provider && (
              <p
                role="alert"
                className="mt-[6px] text-center text-[12px] leading-relaxed"
                style={{ color: palette.red }}
              >
                {error.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-[14px] leading-none" style={{ color: palette.gray500 }}>
        ⒸSpectrum
      </p>
    </div>
  );
}
