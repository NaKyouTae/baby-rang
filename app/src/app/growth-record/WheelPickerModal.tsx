'use client';

import { useEffect, useRef, useState } from 'react';

const ITEM_H = 44;
const VISIBLE = 5;
const HEIGHT = ITEM_H * VISIBLE;

interface Props {
  open: boolean;
  title?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  format?: (v: number) => string;
  onClose: () => void;
  onConfirm: (v: number) => void;
}

export default function WheelPickerModal({
  open,
  title,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  format,
  onClose,
  onConfirm,
}: Props) {
  const count = Math.max(1, Math.round((max - min) / step) + 1);
  const items: number[] = [];
  for (let i = 0; i < count; i++) {
    items.push(+(min + i * step).toFixed(decimals));
  }

  const initialIdx = Math.min(
    count - 1,
    Math.max(0, Math.round((value - min) / step)),
  );

  const ref = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initialIdx);
  const timer = useRef<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(initialIdx);

  useEffect(() => {
    if (!open) return;
    const idx = Math.min(
      count - 1,
      Math.max(0, Math.round((value - min) / step)),
    );
    setSelectedIdx(idx); // eslint-disable-line react-hooks/set-state-in-effect -- sync external value to wheel index when modal opens
    lastRef.current = idx;
    const el = ref.current;
    if (el) el.scrollTop = idx * ITEM_H;
  }, [open, value, min, step, count]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rawIdx = Math.round(el.scrollTop / ITEM_H);
      const idx = Math.max(0, Math.min(count - 1, rawIdx));
      const target = idx * ITEM_H;
      if (Math.abs(el.scrollTop - target) > 0.5) {
        el.scrollTo({ top: target, behavior: 'smooth' });
      }
      if (idx !== lastRef.current) {
        lastRef.current = idx;
        setSelectedIdx(idx);
      }
    }, 90);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-gray-100 rounded-t-2xl pb-[var(--safe-area-bottom)] mb-2 mx-2 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-700 text-center">
            {title}
          </div>
        )}
        <div className="relative bg-white mx-2 mt-2 rounded-2xl">
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-200"
            style={{ height: ITEM_H }}
          />
          <div
            ref={ref}
            onScroll={onScroll}
            className="overflow-y-auto scrollbar-hide relative"
            style={{ height: HEIGHT, scrollBehavior: 'auto' }}
          >
            <div style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}>
              {items.map((v, i) => {
                const selected = i === selectedIdx;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center tabular-nums select-none transition-colors ${
                      selected
                        ? 'text-gray-900 font-bold text-xl'
                        : 'text-gray-400 text-base'
                    }`}
                    style={{ height: ITEM_H }}
                  >
                    {format ? format(v) : String(v)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-2 pt-2 pb-2">
          <button
            type="button"
            onClick={() => {
              onConfirm(items[selectedIdx]);
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-white text-primary-500 text-base font-semibold active:bg-gray-50"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
