'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { palette } from '@/lib/colors';

/* ─── 공용 Wheel Column ─── */

const ITEM_HEIGHT = 36;
const ITEM_GAP = 16;
const SLOT = ITEM_HEIGHT + ITEM_GAP; // 52px per slot
const VISIBLE_COUNT = 3;
const CENTER_INDEX = 1;

const REPEAT_COUNT = 21; // 반복 횟수 (홀수, 중앙 블록이 기준)
const CENTER_BLOCK = Math.floor(REPEAT_COUNT / 2);

export function WheelColumn({
  items,
  selectedIndex,
  onChange,
  suffix,
  circular = false,
}: {
  items: number[];
  selectedIndex: number;
  onChange: (index: number) => void;
  suffix: string;
  circular?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const currentOffset = useRef(0);
  const momentumVelocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);

  const len = items.length;

  // circular: 실제 인덱스는 중앙 블록 기준
  const toVirtualIndex = useCallback((realIdx: number) => CENTER_BLOCK * len + realIdx, [len]);

  const getOffsetForIndex = useCallback((vIdx: number) => -vIdx * SLOT, []);

  const setTransform = useCallback((offset: number, animate: boolean) => {
    if (!containerRef.current) return;
    containerRef.current.style.transition = animate ? 'transform 0.3s cubic-bezier(0.23,1,0.32,1)' : 'none';
    containerRef.current.style.transform = `translateY(${offset}px)`;
  }, []);

  const snapToIndex = useCallback((vIdx: number, animate = true) => {
    if (circular) {
      // vIdx를 실제 인덱스로 변환
      const realIdx = ((vIdx % len) + len) % len;
      // 다시 중앙 블록으로 재배치
      const centerVIdx = toVirtualIndex(realIdx);
      const target = getOffsetForIndex(centerVIdx);
      currentOffset.current = target;
      // animate로 가까운 vIdx로 먼저 이동, 그 뒤 즉시 center로 점프
      const nearTarget = getOffsetForIndex(vIdx);
      setTransform(nearTarget, animate);
      if (animate) {
        setTimeout(() => {
          setTransform(target, false);
        }, 300);
      } else {
        setTransform(target, false);
      }
      onChange(realIdx);
    } else {
      const clamped = Math.max(0, Math.min(len - 1, vIdx));
      const target = getOffsetForIndex(clamped);
      currentOffset.current = target;
      setTransform(target, animate);
      onChange(clamped);
    }
  }, [circular, len, onChange, getOffsetForIndex, setTransform, toVirtualIndex]);

  // Sync when selectedIndex changes externally
  useEffect(() => {
    const vIdx = circular ? toVirtualIndex(selectedIndex) : selectedIndex;
    const target = getOffsetForIndex(vIdx);
    currentOffset.current = target;
    setTransform(target, false);
  }, [selectedIndex, circular, getOffsetForIndex, setTransform, toVirtualIndex]);

  const handleStart = (clientY: number) => {
    isDragging.current = true;
    startY.current = clientY;
    startOffset.current = currentOffset.current;
    momentumVelocity.current = 0;
    lastY.current = clientY;
    lastTime.current = Date.now();

    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientY: number) => {
    if (!isDragging.current) return;
    const delta = clientY - startY.current;
    const newOffset = startOffset.current + delta;
    currentOffset.current = newOffset;

    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${newOffset}px)`;
    }

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      momentumVelocity.current = (clientY - lastY.current) / dt;
    }
    lastY.current = clientY;
    lastTime.current = now;
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const momentum = momentumVelocity.current * 150;
    const finalOffset = currentOffset.current + momentum;
    const vIdx = Math.round(-finalOffset / SLOT);
    snapToIndex(vIdx);
  };

  // Touch
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientY); };
  const onTouchEnd = () => handleEnd();

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleStart(e.clientY); };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  // Build display items
  const displayItems = circular
    ? Array.from({ length: len * REPEAT_COUNT }, (_, i) => items[i % len])
    : items;

  const activeVIdx = circular ? toVirtualIndex(selectedIndex) : selectedIndex;

  return (
    <div
      className="relative flex-1 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{ height: SLOT * VISIBLE_COUNT - ITEM_GAP }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div
        ref={containerRef}
        style={{ paddingTop: SLOT * CENTER_INDEX }}
      >
        {displayItems.map((item, i) => {
          const isSelected = i === activeVIdx;

          return (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{
                height: ITEM_HEIGHT,
                marginBottom: ITEM_GAP,
                fontSize: isSelected ? 20 : 16,
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#000' : '#9ca3af',
                transition: 'color 0.2s, font-size 0.2s',
              }}
            >
              {item}{suffix}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Modal ─── */

interface WheelDatePickerModalProps {
  open: boolean;
  value?: string; // YYYY-MM-DD
  max?: string;
  min?: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDate(s?: string) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? { y, m, d } : null;
}

export default function WheelDatePickerModal({
  open,
  value,
  max,
  min,
  onClose,
  onConfirm,
}: WheelDatePickerModalProps) {
  const today = new Date();

  const init = parseDate(value) ?? {
    y: today.getFullYear(),
    m: today.getMonth() + 1,
    d: today.getDate(),
  };

  const [year, setYear] = useState(init.y);
  const [month, setMonth] = useState(init.m);
  const [day, setDay] = useState(init.d);

  const currentYear = today.getFullYear();
  const minParsed = parseDate(min);
  const maxParsed = parseDate(max);
  const minYear = minParsed?.y ?? currentYear - 10;
  const maxYear = maxParsed?.y ?? currentYear + 5;

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxDay = daysInMonth(year, month);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  useEffect(() => {
    if (open) {
      const i = parseDate(value) ?? {
        y: today.getFullYear(),
        m: today.getMonth() + 1,
        d: today.getDate(),
      };
      setYear(i.y);
      setMonth(i.m);
      setDay(i.d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const m = daysInMonth(year, month);
    if (day > m) setDay(m);
  }, [year, month, day]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  const yearIndex = years.indexOf(year);
  const monthIndex = month - 1;
  const dayIndex = day - 1;

  const handleConfirm = () => {
    onConfirm(`${year}-${pad(month)}-${pad(day)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div className="relative w-full max-w-[360px] bg-white rounded-[8px] shadow-xl overflow-hidden p-[16px]">
        <div className="flex">
          <WheelColumn
            items={years}
            selectedIndex={yearIndex >= 0 ? yearIndex : 0}
            onChange={(i) => setYear(years[i])}
            suffix="년"
          />
          <WheelColumn
            items={months}
            selectedIndex={monthIndex}
            onChange={(i) => setMonth(months[i])}
            suffix="월"
            circular
          />
          <WheelColumn
            items={days}
            selectedIndex={dayIndex >= 0 ? dayIndex : 0}
            onChange={(i) => setDay(days[i])}
            suffix="일"
            circular
          />
        </div>

        <div className="flex gap-[8px] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-[4px] bg-gray-200 text-sm font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-[4px] text-sm font-semibold text-white"
            style={{ backgroundColor: palette.teal }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
