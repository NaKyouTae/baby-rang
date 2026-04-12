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
  loop = false,
}: {
  value: number;
  count: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  loop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastRef = useRef(value);
  const timer = useRef<number | null>(null);
  const isResetting = useRef(false);

  const REPEATS = loop ? 21 : 1;
  const CENTER = Math.floor(REPEATS / 2);
  const totalCount = count * REPEATS;

  const valueToScroll = (v: number) =>
    loop ? (CENTER * count + v) * ITEM_H : v * ITEM_H;

  const [scrollTop, setScrollTop] = useState(() => valueToScroll(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = valueToScroll(value);
    setScrollTop(el.scrollTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastRef.current !== value) {
      lastRef.current = value;
      el.scrollTop = valueToScroll(value);
      setScrollTop(el.scrollTop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || isResetting.current) return;
    setScrollTop(el.scrollTop);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rawIdx = Math.round(el.scrollTop / ITEM_H);

      if (loop) {
        const realVal = ((rawIdx % count) + count) % count;
        const target = rawIdx * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 0.5) {
          el.scrollTo({ top: target, behavior: 'smooth' });
        }
        if (realVal !== lastRef.current) {
          lastRef.current = realVal;
          onChange(realVal);
        }
        if (rawIdx < count * 2 || rawIdx > count * (REPEATS - 2)) {
          isResetting.current = true;
          const centerScroll = (CENTER * count + realVal) * ITEM_H;
          el.scrollTop = centerScroll;
          setScrollTop(centerScroll);
          requestAnimationFrame(() => {
            isResetting.current = false;
          });
        }
      } else {
        const idx = Math.max(0, Math.min(count - 1, rawIdx));
        const target = idx * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 0.5) {
          el.scrollTo({ top: target, behavior: 'smooth' });
        }
        if (idx !== lastRef.current) {
          lastRef.current = idx;
          onChange(idx);
        }
      }
    }, 90);
  };

  const currentIdx = Math.round(scrollTop / ITEM_H);
  const items: React.ReactElement[] = [];
  for (let i = 0; i < totalCount; i++) {
    const realVal = loop ? ((i % count) + count) % count : i;
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
        {format ? format(realVal) : realVal}
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

  // 12시간제 변환
  const isAm = h < 12;
  const h12 = h % 12; // 0~11 (표시는 format에서 0→12로 변환)

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
            value={isAm ? 0 : 1}
            count={2}
            onChange={(v) => {
              // AM/PM 전환: 현재 h12 유지하며 오전/오후만 변경
              setH(v === 0 ? h12 : h12 + 12);
            }}
            format={(v) => (v === 0 ? '오전' : '오후')}
          />
          <VerticalWheel
            value={h12}
            count={12}
            loop
            onChange={(v) => {
              setH(isAm ? v : v + 12);
            }}
            format={(v) => `${String(v === 0 ? 12 : v).padStart(2, '0')}시`}
          />
          <span className="text-2xl font-bold text-gray-400">:</span>
          <VerticalWheel
            value={m}
            count={60}
            loop
            onChange={setM}
            format={(v) => `${String(v).padStart(2, '0')}분`}
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
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-sm font-semibold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
