'use client';

import { useEffect, useState } from 'react';
import {
  BabyFoodUnit,
  DiaperKind,
  SleepNightRange,
  getBabyFoodDefaultUnit,
  getDiaperDefaultKind,
  getSleepNightRange,
  setBabyFoodDefaultUnit,
  setDiaperDefaultKind,
  setSleepNightRange,
} from './recordDefaults';

export type RecordDefaultsMode = 'babyfood' | 'sleepNight' | 'diaper';

interface Props {
  mode: RecordDefaultsMode;
  onClose: () => void;
  onSaved?: () => void;
}

const TITLE: Record<RecordDefaultsMode, string> = {
  babyfood: '이유식 기본 단위 설정',
  sleepNight: '밤잠 기록 시간 설정',
  diaper: '기저귀 기본 타입 설정',
};

function SegmentedGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[4px] border border-gray-200 overflow-hidden">
      {options.map((o, idx) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 py-3 text-sm font-normal text-gray-600 transition ${
              idx > 0 ? 'border-l border-gray-200' : ''
            } ${active ? 'bg-primary-500/10' : 'bg-white active:bg-gray-50'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RecordDefaultsSheet({ mode, onClose, onSaved }: Props) {
  const [unit, setUnit] = useState<BabyFoodUnit>(() =>
    mode === 'babyfood' ? getBabyFoodDefaultUnit() : 'ml',
  );
  const [diaper, setDiaper] = useState<DiaperKind>(() =>
    mode === 'diaper' ? getDiaperDefaultKind() : 'PEE',
  );
  const [range, setRange] = useState<SleepNightRange>(() =>
    mode === 'sleepNight' ? getSleepNightRange() : { start: '19:00', end: '07:00' },
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function handleSave() {
    if (mode === 'babyfood') setBabyFoodDefaultUnit(unit);
    else if (mode === 'diaper') setDiaperDefaultKind(diaper);
    else if (mode === 'sleepNight') setSleepNightRange(range);
    onSaved?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col pb-[var(--safe-area-bottom)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-base font-medium text-app-black">{TITLE[mode]}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-2 space-y-3">
          {mode === 'babyfood' && (
            <div>
              <div className="flex items-baseline mb-2">
                <span className="text-xs font-medium text-gray-500">단위</span>
              </div>
              <SegmentedGroup<BabyFoodUnit>
                value={unit}
                onChange={setUnit}
                options={[
                  { value: 'ml', label: 'ml' },
                  { value: 'g', label: 'g' },
                ]}
              />
            </div>
          )}

          {mode === 'diaper' && (
            <div>
              <div className="flex items-baseline mb-2">
                <span className="text-xs font-medium text-gray-500">타입</span>
              </div>
              <SegmentedGroup<DiaperKind>
                value={diaper}
                onChange={setDiaper}
                options={[
                  { value: 'PEE', label: '소변' },
                  { value: 'POO', label: '대변' },
                  { value: 'BOTH', label: '둘다' },
                ]}
              />
            </div>
          )}

          {mode === 'sleepNight' && (
            <>
              <div>
                <div className="flex items-baseline mb-2">
                  <span className="text-xs font-medium text-gray-500">시작시간</span>
                </div>
                <input
                  type="time"
                  value={range.start}
                  onChange={(e) =>
                    setRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-sm font-normal text-app-black tabular-nums"
                />
              </div>
              <div>
                <div className="flex items-baseline mb-2">
                  <span className="text-xs font-medium text-gray-500">종료시간</span>
                </div>
                <input
                  type="time"
                  value={range.end}
                  onChange={(e) =>
                    setRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-sm font-normal text-app-black tabular-nums"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-4 pt-2 pb-3 flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-[4px] bg-gray-200 text-gray-600 text-sm font-semibold active:bg-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-12 rounded-[4px] bg-primary-500 text-white text-sm font-semibold active:bg-primary-600"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
