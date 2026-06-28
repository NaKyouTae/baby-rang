'use client';

import { useEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';

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

  const handleConfirm = () => {
    // 휠이 막 멈춘 직후 빠르게 누르면 90ms 디바운스 콜백이
    // 아직 실행되지 않아 selectedIdx가 갱신 전일 수 있다.
    // scrollTop에서 직접 계산해 현재 시각적으로 중앙에 있는 값을 보장.
    const el = ref.current;
    let idx = selectedIdx;
    if (el) {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)));
    }
    onConfirm(items[idx]);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      zIndex={80}
      variant="sheet"
      lockBodyScroll={false}
    >
      {title && (
        <div className="px-5 pt-5 pb-2 text-sm font-semibold text-gray-700 text-center">
          {title}
        </div>
      )}
      <div className="bg-white px-5 pt-4">
        {/* 인디케이터 기준 컨테이너 = 스크롤 영역과 동일 높이(패딩 제외)로 두어
            선택 박스 중앙과 선택된 숫자 중앙이 정확히 일치하도록 한다. */}
        <div className="relative" style={{ height: HEIGHT }}>
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-100 rounded-[8px]"
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
                      ? 'text-black font-bold text-xl'
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
      </div>

      <div
        className="flex gap-2 px-5 pt-4"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-12 rounded-[8px] bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 h-12 rounded-[8px] bg-primary-500 text-white text-sm font-semibold active:opacity-90"
        >
          확인
        </button>
      </div>
    </BottomSheet>
  );
}
