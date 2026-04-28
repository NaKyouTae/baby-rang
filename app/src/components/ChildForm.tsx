'use client';

import { useState } from 'react';
import { GENDER_LABEL } from '@/hooks/useChildren';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import FormInput from '@/components/FormInput';
import { palette } from '@/lib/colors';
import { toKstYmd } from '@/lib/childAge';

/** ISO or YYYY-MM-DD → "YYYY. MM. DD." */
function formatDate(d: string): string {
  const ymd = toKstYmd(d);
  return ymd ? ymd.replace(/-/g, '. ') + '.' : '';
}

type Gender = 'male' | 'female';

interface ChildFormProps {
  initialName?: string;
  initialGender?: Gender;
  initialBirthDate?: string;
  initialDueDate?: string;
  submitLabel?: string;
  submittingLabel?: string;
  onSubmit: (data: { name: string; gender: Gender; birthDate: string; dueDate?: string }) => Promise<void>;
}

export default function ChildForm({
  initialName = '',
  initialGender = 'male',
  initialBirthDate = '',
  initialDueDate = '',
  submitLabel = '저장',
  submittingLabel = '저장 중...',
  onSubmit,
}: ChildFormProps) {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender>(initialGender);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [dueDate, setDueDate] = useState(initialDueDate ? toKstYmd(initialDueDate) : '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && birthDate !== '' && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit({ name: name.trim(), gender, birthDate, dueDate: dueDate || undefined });
    setSubmitting(false);
  };

  return (
    <>
      <main className="flex-1 px-6 pt-4 space-y-[24px]">
        {/* 이름(닉네임) */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">
            이름(닉네임) <span className="text-red-500">*</span>
          </p>
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="아기 이름을 입력해 주세요."
            maxLength={20}
          />
        </section>

        {/* 성별 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">
            성별 <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-[8px]">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`min-w-[45px] h-[28px] rounded-[20px] text-xs border transition-colors ${
                  gender === g
                    ? 'font-medium text-white border-transparent'
                    : 'font-normal bg-white border-gray-200 text-gray-400'
                }`}
                style={{
                  paddingLeft: 12, paddingRight: 12,
                  ...(gender === g
                    ? { backgroundColor: palette.teal, borderColor: palette.teal }
                    : {}),
                }}
              >
                {GENDER_LABEL[g]}
              </button>
            ))}
          </div>
        </section>

        {/* 출생일 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">
            출생일 <span className="text-red-500">*</span>
          </p>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="w-full rounded-[4px] border border-gray-200 bg-white px-3 py-3 text-[14px] text-left outline-none focus:border-gray-400 transition-colors"
          >
            <span className={birthDate ? 'text-app-black' : 'text-gray-400'}>
              {birthDate ? formatDate(birthDate) : '출생일을 선택해 주세요.'}
            </span>
          </button>
        </section>

        {/* 출산예정일 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">출산예정일</p>
          <button
            type="button"
            onClick={() => setDueDatePickerOpen(true)}
            className="w-full rounded-[4px] border border-gray-200 bg-white px-3 py-3 text-[14px] text-left outline-none focus:border-gray-400 transition-colors"
          >
            <span className={dueDate ? 'text-app-black' : 'text-gray-400'}>
              {dueDate ? formatDate(dueDate) : '출산예정일을 선택해 주세요.'}
            </span>
          </button>
          <p className="text-[11px] text-gray-400 mt-2">
            출산예정일을 입력하면 더 정확한 발달 분석을 확인하실 수 있어요.
          </p>
        </section>
      </main>

      {/* 하단 고정 저장 버튼 */}
      <div className="fixed bottom-[calc(var(--safe-area-bottom)+112px)] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-6">
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-[4px] text-white text-sm font-bold disabled:opacity-40"
          style={{ backgroundColor: palette.teal }}
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>

      <WheelDatePickerModal
        open={datePickerOpen}
        value={birthDate}
        max={new Date().toISOString().slice(0, 10)}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(d) => setBirthDate(d)}
      />
      <WheelDatePickerModal
        open={dueDatePickerOpen}
        value={dueDate}
        onClose={() => setDueDatePickerOpen(false)}
        onConfirm={(d) => setDueDate(d)}
      />
    </>
  );
}
