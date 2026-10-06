'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import { palette } from '@/lib/colors';

// 로그인/회원가입 진입 전용 경로.
//
// 평소 로그인은 화면 어디서나 뜨는 모달이라 걸 수 있는 주소가 없었다. 그런데
// 카카오·네이버 심사는 "회원가입 화면 링크"를 요구하고, 심사자가 주소를 열었을 때
// 로그인 수단이 바로 보여야 한다. 그래서 열자마자 같은 모달을 띄우는 입구를 둔다.
//
// 모달 UI 를 복제하지 않는다 — 심사자가 보는 화면과 실제 사용자가 보는 화면이
// 달라지면 안 되고, 버튼이 두 벌이 되면 한쪽만 고치는 사고가 난다.
export default function LoginClient() {
  const router = useRouter();
  const { openLoginPrompt } = useLoginPrompt();
  const { isAuthenticated, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    // 이미 로그인한 사람에게 로그인 창을 띄울 이유가 없다.
    if (isAuthenticated) {
      router.replace('/home');
      return;
    }
    openLoginPrompt();
  }, [isLoaded, isAuthenticated, openLoginPrompt, router]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh px-6 text-center"
      style={{ paddingBottom: 'var(--bottom-nav-space)' }}
    >
      <img src="/icon.png" alt="아기랑" width={64} height={64} />
      <h1 className="mt-4 text-[18px] font-medium" style={{ color: palette.black }}>
        육아 동반자 아기랑
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: palette.gray500 }}>
        카카오 또는 네이버 계정으로 시작할 수 있어요.
      </p>

      {/* 모달을 닫았을 때 다시 열 수단. 이게 없으면 빈 화면에 갇힌다. */}
      <button
        type="button"
        onClick={() => openLoginPrompt()}
        className="mt-6 rounded-[4px] px-5 font-semibold text-white"
        style={{ height: 44, fontSize: 14, backgroundColor: palette.teal }}
      >
        로그인하기
      </button>
    </div>
  );
}
