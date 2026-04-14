'use client';

interface LockedSectionProps {
  sections: string[];
  onUnlock: () => void;
}

export default function LockedSection({ sections, onUnlock }: LockedSectionProps) {
  return (
    <div className="mt-6 rounded-3xl bg-primary-50/50 p-5 relative overflow-hidden border border-primary-100">
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative z-10">
        <div className="text-center mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-sm text-gray-500 text-center mb-4">
          무료 결과에서는 대표 기질만 확인할 수 있어요.
        </p>
        <ul className="space-y-2.5 mb-5">
          {sections.map((section) => (
            <li
              key={section}
              className="flex items-center gap-2 text-sm text-gray-400"
            >
              <span className="w-4 h-4 rounded border border-primary-200 flex-shrink-0" />
              {section}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 text-center mb-4">
          전체 결과를 열면 아이의 강점, 예민 포인트, 감정 코칭법, 학습 스타일까지
          자세히 볼 수 있어요.
        </p>
        <button
          onClick={onUnlock}
          className="w-full py-3.5 gradient-btn text-white font-semibold rounded-xl active:scale-[0.97] transition-transform shadow-lg shadow-primary-200"
        >
          전체 결과 보기
        </button>
      </div>
    </div>
  );
}
