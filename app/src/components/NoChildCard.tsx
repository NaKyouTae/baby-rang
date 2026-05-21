'use client';

import { useAuth } from '@/hooks/useAuth';
import { useLoginPrompt } from './LoginPromptProvider';

interface NoChildCardProps {
  /** 카드 클릭 시 로그인 안내 메시지 (비로그인 한정) */
  loginMessage?: string;
}

/**
 * 비로그인 / 아기 미등록 상태에서 ChildSelector 자리에 표시하는 카드.
 * ChildSelector 와 동일한 디자인 — 문구만 다름.
 */
export default function NoChildCard({
  loginMessage = '로그인하고 우리 아기 맞춤 정보를 확인하세요.',
}: NoChildCardProps) {
  const { isAuthenticated } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();

  const handleClick = () => {
    if (!isAuthenticated) {
      openLoginPrompt(loginMessage);
      return;
    }
    window.location.href = '/settings/children';
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center gap-[10px] bg-gray-100 rounded-lg px-4 py-3 border border-gray-200 active:bg-gray-200 transition-colors"
    >
      <div className="rounded-full bg-white border border-[#3078C9] shrink-0 flex items-center justify-center leading-[1] w-10 h-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-baby.svg" alt="" width={28} height={28} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[16px] font-medium text-black truncate">
          등록된 아기가 없어요
        </p>
        <p className="text-[12px] font-normal text-gray-500 mt-1 truncate">
          아기 정보를 입력하고 맞춤형 케어를 시작하세요.
        </p>
      </div>
      <svg
        className="w-5 h-5 text-gray-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
