'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSubmission } from '@/lib/api';
import type { AgeGroup } from '@/lib/api';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import ConfirmModal from '@/components/ConfirmModal';
import { palette } from '@/lib/colors';
import TestStartShell from './TestStartShell';
import type { TestInfo } from './types';

const AGE_GROUPS: { key: AgeGroup; label: string; sub: string; icon: string }[] = [
  { key: 'newborn', label: '신생아', sub: '0-3개월', icon: '/icon-baby.svg' },
  { key: 'before_first', label: '돌 이전', sub: '4-11개월', icon: '/icon-boy.svg' },
  { key: 'after_first', label: '돌 이후', sub: '12개월-', icon: '/icon-child.svg' },
];

export default function TemperamentStartClient({ test }: { test: TestInfo }) {
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
      router.push(`/tests/${test.id}/test/${submissionId}?ageGroup=${selectedAge}`);
    } catch {
      setErrorOpen(true);
      setLoading(false);
    }
  };

  return (
    <>
      <TestStartShell
        test={test}
        middleSlot={
          <div className="flex gap-2.5 justify-center">
            {AGE_GROUPS.map((ag) => {
              const selected = selectedAge === ag.key;
              return (
                <button
                  key={ag.key}
                  onClick={() => setSelectedAge(ag.key)}
                  className="shrink-0 w-[102px] h-[108px] flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200"
                  style={{
                    backgroundColor: selected ? 'rgba(48, 120, 201, 0.1)' : '#FFFFFF',
                    borderColor: selected ? palette.teal : palette.gray100,
                  }}
                >
                  <div
                    className="flex items-center justify-center mb-2.5"
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${palette.teal}`,
                    }}
                  >
                    <Image src={ag.icon} alt="" width={24} height={24} />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className="text-[16px] font-medium leading-none"
                      style={{ color: palette.black }}
                    >
                      {ag.label}
                    </span>
                    <span
                      className="text-[12px] font-normal leading-none"
                      style={{ color: palette.gray500 }}
                    >
                      {ag.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        }
        bottomSlot={
          (() => {
            const disabled = loading || !selectedAge;
            return (
              <button
                onClick={handleStart}
                disabled={disabled}
                className="w-full h-10 rounded-[4px] text-[14px] font-semibold transition-all active:opacity-80"
                style={{
                  backgroundColor: disabled ? palette.gray200 : palette.teal,
                  color: disabled ? palette.gray400 : '#FFFFFF',
                }}
              >
                검사 시작하기
              </button>
            );
          })()
        }
      />

      <ConfirmModal
        open={errorOpen}
        icon="⚠️"
        title={'검사를 시작할 수 없어요'}
        description={'잠시 후 다시 시도해 주세요.'}
        confirmLabel="확인"
        hideCancel
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />
    </>
  );
}
