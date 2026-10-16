'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { selectionFeedback } from '@/lib/selectionFeedback';

const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 5;

interface WheelOption {
  value: number;
  label: string;
}

function DateWheel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: WheelOption[];
  value: number;
  onChange: (value: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(options.findIndex((option) => option.value === value));
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (lastIndex.current === selectedIndex) return;
    lastIndex.current = selectedIndex;
    if (scrollRef.current) scrollRef.current.scrollTop = selectedIndex * ROW_HEIGHT;
  }, [selectedIndex]);

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={label}
      className="relative min-w-0 overflow-y-auto overscroll-contain scrollbar-hide select-none"
      style={{
        height: ROW_HEIGHT * VISIBLE_ROWS,
        scrollSnapType: 'y mandatory',
        touchAction: 'pan-y',
        maskImage: 'linear-gradient(transparent, black 25%, black 75%, transparent)',
        WebkitMaskImage: 'linear-gradient(transparent, black 25%, black 75%, transparent)',
      }}
      onScroll={(event) => {
        const next = Math.max(
          0,
          Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / ROW_HEIGHT)),
        );
        if (next === lastIndex.current) return;
        lastIndex.current = next;
        onChange(options[next].value);
        selectionFeedback();
      }}
    >
      <div style={{ paddingBlock: ROW_HEIGHT * 2 }}>
        {options.map((option, index) => (
          <div
            key={option.value}
            role="option"
            aria-selected={index === selectedIndex}
            className="flex items-center justify-center whitespace-nowrap tabular-nums"
            style={{
              height: ROW_HEIGHT,
              scrollSnapAlign: 'center',
              color: index === selectedIndex ? '#333333' : 'rgba(60, 60, 67, 0.38)',
              fontSize: index === selectedIndex ? 24 : 20,
              fontWeight: index === selectedIndex ? 500 : 400,
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatternDatePickerModal({
  open,
  value,
  onClose,
  onConfirm,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  useEffect(() => {
    if (!open) return;
    const [y, m, d] = value.split('-').map(Number);
    setYear(y || today.getFullYear());
    setMonth(m || today.getMonth() + 1);
    setDay(d || today.getDate());
    // open 변경 시점에 전달된 날짜로 휠을 초기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const maxYear = today.getFullYear();
  const maxMonth = year === maxYear ? today.getMonth() + 1 : 12;
  const maxDay = new Date(year, month, 0).getDate();
  const dayLimit = year === maxYear && month === maxMonth ? today.getDate() : maxDay;
  const yearOptions = Array.from({ length: 11 }, (_, index) => maxYear - 10 + index).map((n) => ({
    value: n,
    label: `${n}년`,
  }));
  const monthOptions = Array.from({ length: maxMonth }, (_, index) => index + 1).map((n) => ({
    value: n,
    label: `${n}월`,
  }));
  const dayOptions = Array.from({ length: dayLimit }, (_, index) => index + 1).map((n) => ({
    value: n,
    label: `${n}일`,
  }));

  useEffect(() => {
    if (month > maxMonth) setMonth(maxMonth);
    const limit = new Date(year, Math.min(month, maxMonth), 0).getDate();
    const boundedLimit = year === maxYear && month >= maxMonth ? Math.min(limit, today.getDate()) : limit;
    if (day > boundedLimit) setDay(boundedLimit);
  }, [year, month, day, maxMonth, maxYear, today]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20"
      role="dialog"
      aria-modal="true"
      aria-label="날짜 선택"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] px-[8px] flex flex-col gap-[8px]"
        style={{ paddingBottom: 'max(8px, var(--safe-area-bottom))', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[14px] bg-[#F2F1EF] overflow-hidden">
          <div className="relative mx-[10px] my-[12px]">
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-[8px] bg-[#E6E5E4] pointer-events-none"
              style={{ height: ROW_HEIGHT }}
            />
            <div className="grid grid-cols-[1.3fr_1fr_1fr]">
              <DateWheel
                label="연도"
                options={yearOptions}
                value={year}
                onChange={(next) => setYear(next)}
              />
              <DateWheel
                label="월"
                options={monthOptions}
                value={Math.min(month, maxMonth)}
                onChange={(next) => setMonth(next)}
              />
              <DateWheel
                label="일"
                options={dayOptions}
                value={Math.min(day, dayLimit)}
                onChange={(next) => setDay(next)}
              />
            </div>
          </div>
          <button
            type="button"
            className="w-full h-[56px] text-[20px] text-[#007AFF] font-medium active:bg-[#E6E5E4]"
            style={{ borderTop: '0.5px solid #D1D1D6' }}
            onClick={() => {
              const safeMonth = Math.min(month, maxMonth);
              const validDayLimit =
                year === maxYear && safeMonth === maxMonth
                  ? Math.min(new Date(year, safeMonth, 0).getDate(), today.getDate())
                  : new Date(year, safeMonth, 0).getDate();
              const safeDay = Math.min(day, validDayLimit);
              onConfirm(
                `${year}-${String(safeMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`,
              );
              onClose();
            }}
          >
            선택완료
          </button>
        </div>
        <button
          type="button"
          className="h-[56px] rounded-[14px] bg-white text-[#007AFF] text-[20px] font-medium active:bg-[#F2F2F7]"
          onClick={onClose}
        >
          취소
        </button>
      </div>
    </div>
  );
}
