'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DateTimeWheelModal from './DateTimeWheelModal';
import { openNativeDateTimePicker } from '@/lib/nativeDateTimePicker';
import { useAppOverlayLock } from '@/components/ads/appOverlay';
import { PIXEL_FONT } from './pixelUi';
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
  sleepNight: '밤잠 시간 설정',
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
    <div className="flex rounded-[4px] border border-[#808991] overflow-hidden">
      {options.map((o, idx) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 min-w-0 h-[50px] px-[10px] text-[16px] leading-none transition ${
              idx > 0 ? 'border-l border-[#808991]' : ''
            } ${
              active
                ? 'bg-[#2C2C2C] text-[#FDFDFE]'
                : 'bg-[#FDFDFE] text-[#808991] active:bg-[#F7F8F9]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TimeWheelField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (value: string) => void; className: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  useAppOverlayLock(pending);
  useEffect(() => () => cancelRef.current?.(), []);
  const dateValue = `2000-01-01T${value}`;
  return <>
    <button type="button" aria-label={label} aria-haspopup="dialog" disabled={pending}
      className={`${className} text-left`} onClick={() => {
        if (pending || open) return;
        const cancel = openNativeDateTimePicker(label, dateValue, result => {
          cancelRef.current = null;
          setPending(false);
          if (result.error) setOpen(true);
          else if (result.value !== null) onChange(result.value.slice(11, 16));
        }, 'time');
        if (cancel) { cancelRef.current = cancel; setPending(true); }
        else setOpen(true);
      }}>{value}</button>
    {open && createPortal(<DateTimeWheelModal timeOnly title={label} value={dateValue}
      onClose={() => setOpen(false)} onConfirm={next => onChange(next.slice(11, 16))} />, document.body)}
  </>;
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

  function handleSave() {
    if (mode === 'babyfood') setBabyFoodDefaultUnit(unit);
    else if (mode === 'diaper') setDiaperDefaultKind(diaper);
    else if (mode === 'sleepNight') setSleepNightRange(range);
    onSaved?.();
    onClose();
  }

  // 기록 시트 위에 뜨는 가운데 설정 모달(Figma 기록 > 수면/기저귀 > 설정)
  useAppOverlayLock(true);
  const label = 'text-[14px] leading-[1.4] text-[#808991]';
  const timeInput =
    'w-full h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] text-[16px] leading-none text-[#121212] tabular-nums';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-[20px]"
      role="dialog"
      aria-modal="true"
      aria-label={TITLE[mode]}
      style={{ fontFamily: PIXEL_FONT }}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-[350px] bg-[#FDFDFE] rounded-[16px] p-[20px] flex flex-col gap-[24px]">
        <div className="py-[8px]">
          <h2 className="text-center text-[16px] leading-none font-normal text-[#121212]">
            {TITLE[mode]}
          </h2>
        </div>

        <div className="flex flex-col gap-[10px]">
          {mode === 'babyfood' && (
            <div className="flex flex-col gap-[8px]">
              <span className={label}>단위</span>
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
            <div className="flex flex-col gap-[8px]">
              <span className={label}>타입</span>
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
              <div className="flex flex-col gap-[8px]">
                <span className={label}>시작 시간</span>
                <TimeWheelField label="시작 시간" value={range.start}
                  onChange={start => setRange(prev => ({ ...prev, start }))} className={timeInput} />
              </div>
              <div className="flex flex-col gap-[8px]">
                <span className={label}>종료 시간</span>
                <TimeWheelField label="종료 시간" value={range.end}
                  onChange={end => setRange(prev => ({ ...prev, end }))} className={timeInput} />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
