'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAppOverlayLock } from '@/components/ads/appOverlay';
import { selectionFeedback } from '@/lib/selectionFeedback';

const ITEM_H = 32;
const VISIBLE = 7;
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
  useAppOverlayLock(open);
  const optionId = useId();
  const items = Array.from({ length: Math.round((max - min) / step) + 1 },
    (_, i) => Number((min + i * step).toFixed(decimals)));
  if (Number.isFinite(value) && !items.includes(value)) items.push(value);
  items.sort((a, b) => a - b);
  const count = items.length;
  const initialIdx = items.indexOf(value) >= 0 ? items.indexOf(value)
    : Math.max(0, Math.min(count - 1, Math.round((value - min) / step)));

  const ref = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initialIdx);
  const [selectedIdx, setSelectedIdx] = useState(initialIdx);

  useEffect(() => {
    if (!open) return;
    const idx = initialIdx;
    setSelectedIdx(idx); // eslint-disable-line react-hooks/set-state-in-effect -- sync external value to wheel index when modal opens
    lastRef.current = idx;
    const el = ref.current;
    if (el) el.scrollTop = idx * ITEM_H;
  }, [open, initialIdx]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)));
    if (idx !== lastRef.current) {
      lastRef.current = idx;
      setSelectedIdx(idx);
      selectionFeedback();
    }
  };

  const handleConfirm = () => {
    // 관성 스크롤 중 확인을 눌러도 중앙에 가장 가까운 값을 저장한다.
    const el = ref.current;
    let idx = selectedIdx;
    if (el) {
      idx = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ITEM_H)));
    }
    onConfirm(items[idx]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20"
      role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-[430px] px-[8px] pt-[8px] flex flex-col gap-[8px]"
        style={{ paddingBottom: 'max(8px, var(--safe-area-bottom))',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[14px] bg-[#F2F1EF] px-[40px] py-[12px]">
          <div className="relative" style={{ height: HEIGHT }}>
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-[8px] bg-[#E6E5E4]"
              style={{ height: ITEM_H }} />
            <div ref={ref} role="listbox" aria-label={title} tabIndex={0}
              aria-activedescendant={`${optionId}-${selectedIdx}`}
              onScroll={onScroll}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); return; }
                if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
                const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
                if (!delta) return;
                e.preventDefault();
                const idx = Math.max(0, Math.min(count - 1, selectedIdx + delta));
                if (ref.current) ref.current.scrollTop = idx * ITEM_H;
                setSelectedIdx(idx);
              }}
              className="relative overflow-y-auto scrollbar-hide select-none outline-none"
              style={{ height: HEIGHT, scrollBehavior: 'auto', overscrollBehavior: 'contain',
                scrollSnapType: 'y mandatory', touchAction: 'pan-y', WebkitTouchCallout: 'none',
                maskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)',
                WebkitMaskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)' }}>
              <div style={{ paddingBlock: ITEM_H * Math.floor(VISIBLE / 2) }}>
                {items.map((v, i) => {
                  const distance = Math.abs(i - selectedIdx);
                  return (
                    <div key={v} id={`${optionId}-${i}`} role="option" aria-selected={i === selectedIdx}
                      className="flex items-center justify-center select-none tabular-nums"
                      style={{ height: ITEM_H, scrollSnapAlign: 'center', color: distance === 0 ? '#121212' : '#999999',
                        fontSize: 22, transform: `scale(${Math.max(0.65, 1 - distance * 0.08)})` }}>
                      {format ? format(v) : String(v)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <button type="button" onClick={handleConfirm}
          className="h-[56px] shrink-0 rounded-[14px] bg-white text-[#007AFF] text-[20px] font-medium active:bg-[#F2F2F7]">
          확인
        </button>
      </div>
    </div>
  );
}
