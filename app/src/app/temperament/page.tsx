'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSubmission } from '@/lib/api';
import type { AgeGroup } from '@/lib/api';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import ConfirmModal from '@/components/ConfirmModal';

const AGE_GROUPS: { key: AgeGroup; label: string; sub: string; emoji: string }[] = [
  { key: 'newborn', label: '신생아', sub: '0~3개월', emoji: '👶' },
  { key: 'before_first', label: '돌 전', sub: '4~11개월', emoji: '🧒' },
  { key: 'after_first', label: '돌 후', sub: '12개월~', emoji: '🧒' },
];

export default function TemperamentPage() {
  const router = useRouter();
  const { requireLogin } = useLoginPrompt();
  const [loading, setLoading] = useState(false);
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);

  const handleStart = async () => {
    if (!selectedAge) return;
    if (!requireLogin('기질 검사를 시작하려면\n로그인이 필요해요.')) return;
    setLoading(true);
    try {
      const { submissionId } = await createSubmission(selectedAge);
      router.push(`/temperament/test/${submissionId}?ageGroup=${selectedAge}`);
    } catch {
      setErrorOpen(true);
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center text-center h-[calc(100dvh-4rem)] gradient-page">
      <span className="text-7xl mb-4">🧒</span>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        우리 아이 기질 검사
      </h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">
        아이의 타고난 반응 방식을 이해하고,
        <br />
        양육 힌트를 얻어보세요.
      </p>

      <div className="w-full max-w-xs mb-5">
        <p className="text-xs font-semibold text-gray-400 mb-3">아이의 나이대를 선택해 주세요</p>
        <div className="flex gap-2">
          {AGE_GROUPS.map((ag) => (
            <button
              key={ag.key}
              onClick={() => setSelectedAge(ag.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all duration-200 ${
                selectedAge === ag.key
                  ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                  : 'border-gray-100 bg-white hover:border-primary-200'
              }`}
            >
              <span className="text-lg">{ag.emoji}</span>
              <span className={`text-sm font-bold ${selectedAge === ag.key ? 'text-primary-600' : 'text-gray-700'}`}>
                {ag.label}
              </span>
              <span className="text-[10px] text-gray-400">{ag.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg">📝</span>
          <span>30문항</span>
        </div>
        <span className="w-px h-8 bg-gray-200" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg">⏱</span>
          <span>약 5~10분</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-center leading-relaxed mb-3">
        이 검사는 의학적 진단이 아닌 기질 이해용 참고 자료입니다.
      </p>

      <button
        onClick={handleStart}
        disabled={loading || !selectedAge}
        className="w-full max-w-xs py-4 bg-gray-900 text-white font-bold rounded-2xl transition-all disabled:opacity-50 active:scale-[0.97]"
      >
        {loading ? '준비 중...' : !selectedAge ? '나이대를 선택해 주세요' : '검사 시작하기'}
      </button>

      <ConfirmModal
        open={errorOpen}
        emoji="⚠️"
        title={'검사를 시작할 수 없어요'}
        description={'잠시 후 다시 시도해 주세요.'}
        confirmLabel="확인"
        hideCancel
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />
    </main>
  );
}
