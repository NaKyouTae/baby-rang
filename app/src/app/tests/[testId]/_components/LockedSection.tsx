'use client';

import Image from 'next/image';
import { palette } from '@/lib/colors';

interface LockedSectionProps {
  sections: string[];
  onUnlock: () => void;
}

export default function LockedSection({ sections, onUnlock }: LockedSectionProps) {
  return (
    <div
      className="mt-6 rounded-lg p-6"
      style={{
        backgroundColor: palette.gray100,
        border: `1px solid ${palette.gray200}`,
      }}
    >
      <div className="flex justify-center mb-4">
        <Image
          src="/ic-lock.svg"
          alt=""
          width={40}
          height={40}
          aria-hidden
        />
      </div>
      <p
        className="text-[13px] text-center mb-5"
        style={{ color: palette.gray500 }}
      >
        무료 결과에서는 대표 기질만 확인할 수 있어요.
      </p>
      <div className="space-y-2 mb-5">
        {sections.map((section) => (
          <div
            key={section}
            className="bg-white rounded-[8px] py-3 text-center text-[13px] text-app-black"
            style={{ border: `1px solid ${palette.gray200}` }}
          >
            {section}
          </div>
        ))}
      </div>
      <p
        className="text-[12px] text-center leading-relaxed mb-5"
        style={{ color: palette.gray500 }}
      >
        전체 결과를 알면 아기의 강점, 예민 포인트, 감정 코칭법,
        학습 스타일까지 자세히 볼 수 있어요.
      </p>
      <button
        onClick={onUnlock}
        className="w-full py-3.5 bg-primary-500 text-white font-semibold rounded-[4px] active:scale-[0.97] transition-transform"
      >
        전체 결과보기
      </button>
    </div>
  );
}
