'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;
  minute: number;
  onConfirm: (mo: number, d: number, h: number, m: number) => void;
  onClose: () => void;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const ITEM_H = 44;
const VISIBLE = 5;
const HEIGHT = ITEM_H * VISIBLE;

function VerticalWheel({
  value,
  count,
  format,
  onChange,
}: {
  value: number;
  count: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastRef = useRef(value);
  const timer = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(value * ITEM_H);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = value * ITEM_H;
    setScrollTop(el.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastRef.current !== value) {
      lastRef.current = value;
      el.scrollTop = value * ITEM_H;
      setScrollTop(el.scrollTop);
    }
  }, [value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const idx = Math.max(
        0,
        Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)),
      );
      const target = idx * ITEM_H;
      if (Math.abs(el.scrollTop - target) > 0.5) {
        el.scrollTo({ top: target, behavior: 'smooth' });
      }
      if (idx !== lastRef.current) {
        lastRef.current = idx;
        onChange(idx);
      }
    }, 90);
  };

  const currentIdx = Math.round(scrollTop / ITEM_H);
  const items: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const selected = i === currentIdx;
    items.push(
      <div
        key={i}
        className={`flex items-center justify-center tabular-nums ${
          selected
            ? 'text-gray-900 font-bold text-xl'
            : 'text-gray-400 text-base'
        }`}
        style={{ height: ITEM_H }}
      >
        {format ? format(i) : i}
      </div>,
    );
  }

  return (
    <div className="relative flex-1">
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl bg-gray-100"
        style={{ height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="overflow-y-auto scrollbar-hide relative"
        style={{ height: HEIGHT, scrollBehavior: 'auto' }}
      >
        <div style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}>
          {items}
        </div>
      </div>
    </div>
  );
}

export default function TimePickerModal({
  open,
  year,
  month,
  day,
  hour,
  minute,
  onConfirm,
  onClose,
}: Props) {
  const [mo, setMo] = useState(month);
  const [d, setD] = useState(day);
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  useEffect(() => {
    if (open) {
      setMo(month);
      setD(day);
      setH(hour);
      setM(minute);
    }
  }, [open, month, day, hour, minute]);

  // 월이 바뀌면 일 클램프
  const dayCount = daysInMonth(year, mo);
  useEffect(() => {
    if (d > dayCount) setD(dayCount);
  }, [dayCount, d]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] bg-white rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900 mb-4 text-center">
          날짜 · 시간 선택
        </h3>
        <div className="flex items-center gap-2">
          <VerticalWheel
            value={mo - 1}
            count={12}
            onChange={(v) => setMo(v + 1)}
            format={(v) => `${v + 1}월`}
          />
          <VerticalWheel
            value={Math.min(d, dayCount) - 1}
            count={dayCount}
            onChange={(v) => setD(v + 1)}
            format={(v) => `${v + 1}일`}
          />
          <VerticalWheel
            value={h}
            count={24}
            onChange={setH}
            format={(v) => String(v).padStart(2, '0')}
          />
          <span className="text-2xl font-bold text-gray-400">:</span>
          <VerticalWheel
            value={m}
            count={60}
            onChange={setM}
            format={(v) => String(v).padStart(2, '0')}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              const safeDay = Math.min(d, dayCount);
              onConfirm(mo, safeDay, h, m);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-sm font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
