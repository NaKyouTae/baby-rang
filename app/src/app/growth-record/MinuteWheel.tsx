'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** 0..1439 (하루 분 단위) */
  value: number;
  onChange: (minutes: number) => void;
  /** 양 끝(0/1439)을 넘어 드래그할 때 호출. 일자를 ±1일 시프트 */
  onOverflow?: (deltaDays: number) => void;
  /** 휠을 탭(드래그 아님)했을 때 호출 — 모달 열기 등 */
  onTap?: () => void;
}

const ITEM_W = 56;
const COUNT = 1440;
const HEIGHT = 76;

export default function MinuteWheel({ value, onChange, onOverflow, onTap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const lastEmitRef = useRef(value);
  const snapTimer = useRef<number | null>(null);
  const downPos = useRef<{ x: number; y: number; t: number; sl: number } | null>(null);

  // 컨테이너 폭 측정
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 외부 value 변경 시 스크롤 동기화
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastEmitRef.current !== value) {
      lastEmitRef.current = value;
      const target = value * ITEM_W;
      if (Math.abs(el.scrollLeft - target) > 1) {
        el.scrollLeft = target;
        setScrollLeft(target);
      }
    }
  }, [value]);

  // 초기 위치
  useEffect(() => {
    const el = ref.current;
    if (!el || containerW === 0) return;
    el.scrollLeft = value * ITEM_W;
    setScrollLeft(el.scrollLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerW]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      const rawIdx = Math.round(el.scrollLeft / ITEM_W);

      // 양 끝 넘으면 일자 시프트
      if (rawIdx < 0 && onOverflow) {
        onOverflow(-1);
        const next = COUNT + rawIdx; // 예: -1 → 1439
        lastEmitRef.current = next;
        el.scrollLeft = next * ITEM_W;
        setScrollLeft(el.scrollLeft);
        onChange(next);
        return;
      }
      if (rawIdx >= COUNT && onOverflow) {
        onOverflow(1);
        const next = rawIdx - COUNT;
        lastEmitRef.current = next;
        el.scrollLeft = next * ITEM_W;
        setScrollLeft(el.scrollLeft);
        onChange(next);
        return;
      }

      const idx = Math.max(0, Math.min(COUNT - 1, rawIdx));
      const target = idx * ITEM_W;
      if (Math.abs(el.scrollLeft - target) > 0.5) {
        el.scrollTo({ left: target, behavior: 'smooth' });
      }
      if (idx !== lastEmitRef.current) {
        lastEmitRef.current = idx;
        onChange(idx);
      }
    }, 90);
  };

  // 가상 렌더링 — 보이는 범위만
  const padX = containerW > 0 ? containerW / 2 - ITEM_W / 2 : 0;
  const buffer = 6;
  const visibleCount = containerW > 0 ? Math.ceil(containerW / ITEM_W) + buffer * 2 : 0;
  const startIdx =
    containerW > 0
      ? Math.max(0, Math.floor((scrollLeft) / ITEM_W) - buffer)
      : 0;
  const endIdx = Math.min(COUNT, startIdx + visibleCount);
  const currentIdx = Math.round(scrollLeft / ITEM_W);

  const items: React.ReactElement[] = [];
  for (let i = startIdx; i < endIdx; i++) {
    const selected = i === currentIdx;
    const h = Math.floor(i / 60);
    const m = i % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    items.push(
      <div
        key={i}
        className="absolute top-0 flex items-center justify-center"
        style={{
          left: padX + i * ITEM_W,
          width: ITEM_W,
          height: HEIGHT,
        }}
      >
        <span
          className={
            selected
              ? 'text-white font-bold text-lg tabular-nums'
              : 'text-gray-400 text-xs tabular-nums'
          }
        >
          {h12}:{String(m).padStart(2, '0')}
        </span>
      </div>,
    );
  }

  const innerW = COUNT * ITEM_W + padX * 2;

  return (
    <div className="relative">
      {/* 중앙 인디케이터 */}
      <div
        className="pointer-events-none absolute top-1 bottom-1 left-1/2 -translate-x-1/2 rounded-2xl bg-primary-500 shadow-md z-0"
        style={{ width: ITEM_W + 4 }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={(e) => {
          downPos.current = {
            x: e.clientX,
            y: e.clientY,
            t: Date.now(),
            sl: ref.current?.scrollLeft ?? 0,
          };
        }}
        onPointerUp={(e) => {
          if (!onTap || !downPos.current) return;
          const dx = Math.abs(e.clientX - downPos.current.x);
          const dy = Math.abs(e.clientY - downPos.current.y);
          const dt = Date.now() - downPos.current.t;
          const dsl = Math.abs(
            (ref.current?.scrollLeft ?? 0) - downPos.current.sl,
          );
          if (dx < 6 && dy < 6 && dt < 300 && dsl < 4) onTap();
          downPos.current = null;
        }}
        className="overflow-x-auto scrollbar-hide touch-pan-x relative cursor-pointer"
        style={{ scrollBehavior: 'auto', height: HEIGHT }}
      >
        <div style={{ position: 'relative', width: innerW, height: HEIGHT }}>
          {items}
        </div>
      </div>
    </div>
  );
}
