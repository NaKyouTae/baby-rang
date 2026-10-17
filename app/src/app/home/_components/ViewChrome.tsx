'use client';

/**
 * 보기 모드 UI.
 *
 * 아이 카드·기록 버튼·탭바를 전부 걷어내고 방만 보여 준다.
 * 남는 건 오른쪽 위 닫기(X) 하나 — 꾸미기 모드의 X 와 같은 자리, 같은 모양이다.
 */

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

export default function ViewChrome({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <button
        type="button"
        onClick={onClose}
        aria-label="보기 끝내기"
        className={`${BOX} absolute right-[20px] size-[48px] flex items-center justify-center pointer-events-auto active:translate-y-px`}
        style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/close.svg" alt="" width={24} height={24} className="block" />
      </button>
    </div>
  );
}
