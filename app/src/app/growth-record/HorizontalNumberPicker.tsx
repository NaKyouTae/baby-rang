'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  itemWidth?: number;
  format?: (v: number) => string;
  decimals?: number;
}

/**
 * 가로 드래그/스크롤로 값을 선택하는 휠 형태의 피커.
 * 중앙 정렬 + scroll-snap 으로 자연스러운 모바일 인터랙션 제공.
 */
export default function HorizontalNumberPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  itemWidth = 48,
  format,
  decimals = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<number>(value);
  const scrollTimerRef = useRef<number | null>(null);

  const count = Math.max(1, Math.round((max - min) / step) + 1);
  const items: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = +(min + i * step).toFixed(decimals);
    items.push(v);
  }

  const indexOf = (v: number) =>
    Math.min(count - 1, Math.max(0, Math.round((v - min) / step)));

  // value prop → scroll position 동기화
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = indexOf(value) * itemWidth;
    if (Math.abs(el.scrollLeft - target) > 1 && lastEmittedRef.current !== value) {
      el.scrollTo({ left: target });
      lastEmittedRef.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, itemWidth]);

  // 초기 위치 세팅
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = indexOf(value) * itemWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollLeft / itemWidth);
      const v = items[Math.min(items.length - 1, Math.max(0, idx))];
      if (v !== lastEmittedRef.current) {
        lastEmittedRef.current = v;
        onChange(v);
      }
    }, 40);
  };

  const pad = `calc(50% - ${itemWidth / 2}px)`;

  return (
    <div className="relative w-full overflow-hidden">
      {/* 중앙 인디케이터 */}
      <div
        className="pointer-events-none absolute top-1 bottom-1 left-1/2 -translate-x-1/2 rounded-2xl bg-gray-900 shadow-md z-0"
        style={{ width: itemWidth + 4 }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="overflow-x-auto scrollbar-hide flex snap-x snap-mandatory touch-pan-x"
        style={{ scrollBehavior: 'auto' }}
      >
        <div style={{ flex: `0 0 ${pad}` }} />
        {items.map((v, i) => {
          const selected = i === indexOf(value);
          return (
            <div
              key={i}
              className="snap-center shrink-0 flex items-center justify-center relative z-[1]"
              style={{ width: itemWidth, height: 60 }}
            >
              <span
                className={
                  selected
                    ? 'text-white font-bold text-xl tabular-nums'
                    : 'text-gray-400 text-sm tabular-nums'
                }
              >
                {format ? format(v) : v}
              </span>
            </div>
          );
        })}
        <div style={{ flex: `0 0 ${pad}` }} />
      </div>
    </div>
  );
}
