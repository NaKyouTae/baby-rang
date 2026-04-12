'use client';

import { useEffect, useRef, useState } from 'react';
import TimePickerModal from './TimePickerModal';

interface Props {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (v: string) => void;
}

function parse(s: string) {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date();
    return {
      y: d.getFullYear(),
      mo: d.getMonth() + 1,
      d: d.getDate(),
      h: d.getHours(),
      mi: d.getMinutes(),
    };
  }
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

function fmt(y: number, mo: number, d: number, h: number, mi: number) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}`;
}

function dateLabel(y: number, mo: number, d: number) {
  const target = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === -1) return '어제';
  if (diff === 1) return '내일';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${mo}월 ${d}일 (${days[target.getDay()]})`;
}

/* ── 인라인 스크롤 휠 ── */
const ITEM_H = 40;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;

function InlineWheel({
  value,
  count,
  format,
  onChange,
  loop = false,
}: {
  value: number;
  count: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  loop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastRef = useRef(value);
  const timer = useRef<number | null>(null);
  const isResetting = useRef(false);

  // 루프 모드: 아이템을 REPEATS번 반복, 중앙 세트를 기준으로 스크롤
  const REPEATS = loop ? 21 : 1;
  const CENTER = Math.floor(REPEATS / 2); // 중앙 세트 인덱스
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
        // 스냅
        const target = rawIdx * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 0.5) {
          el.scrollTo({ top: target, behavior: 'smooth' });
        }
        if (realVal !== lastRef.current) {
          lastRef.current = realVal;
          onChange(realVal);
        }
        // 끝에 가까우면 중앙으로 리셋
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
    const realVal = ((i % count) + count) % count;
    const selected = i === currentIdx;
    items.push(
      <div
        key={i}
        className={`flex items-center justify-center tabular-nums select-none ${
          selected
            ? 'text-gray-900 font-bold text-lg'
            : 'text-gray-300 text-sm'
        }`}
        style={{ height: ITEM_H }}
      >
        {format(realVal)}
      </div>,
    );
  }

  return (
    <div className="relative" style={{ height: WHEEL_H }}>
      {/* 선택 영역 표시 */}
      <div
        className="pointer-events-none absolute -left-2 -right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gray-200/70"
        style={{ height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        className="overflow-y-auto scrollbar-hide relative"
        style={{ height: WHEEL_H, scrollBehavior: 'auto' }}
      >
        <div style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}>
          {items}
        </div>
      </div>
    </div>
  );
}

export default function DateTimeDragPicker({ value, onChange }: Props) {
  const { y, mo, d, h, mi } = parse(value);

  const setNow = () => {
    const now = new Date();
    onChange(
      fmt(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
      ),
    );
  };

  const [showTimeModal, setShowTimeModal] = useState(false);

  return (
    <div className="rounded-2xl bg-gray-50 p-3 space-y-2">
      {/* 시간·분 인라인 휠 */}
      <div className="flex items-center justify-center gap-4">
        {/* 오전/오후 */}
        <div className="mr-4">
          <InlineWheel
            value={h < 12 ? 0 : 1}
            count={2}
            onChange={(v) => {
              const newH = v === 0 ? (h >= 12 ? h - 12 : h) : (h < 12 ? h + 12 : h);
              onChange(fmt(y, mo, d, newH, mi));
            }}
            format={(v) => (v === 0 ? '오전' : '오후')}
          />
        </div>
        {/* 시 */}
        <InlineWheel
          value={h % 12}
          count={12}
          loop
          onChange={(v) => {
            const newH = h < 12 ? v : v + 12;
            onChange(fmt(y, mo, d, newH, mi));
          }}
          format={(v) => `${String(v === 0 ? 12 : v).padStart(2, '0')}시`}
        />
        <span className="text-xl font-bold text-gray-300 mx-0.5">:</span>
        {/* 분 */}
        <InlineWheel
          value={mi}
          count={60}
          loop
          onChange={(v) => onChange(fmt(y, mo, d, h, v))}
          format={(v) => `${String(v).padStart(2, '0')}분`}
        />
      </div>

      {/* 날짜 · 지금 · 날짜시간 모달 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowTimeModal(true)}
          className="px-2.5 py-1 rounded-full bg-white shadow-sm text-[11px] font-semibold text-gray-700 active:bg-gray-100"
        >
          📅 {dateLabel(y, mo, d)}
        </button>
        <button
          type="button"
          onClick={setNow}
          className="px-2.5 py-1 rounded-full bg-white shadow-sm text-[11px] font-semibold text-gray-700 active:bg-gray-100"
        >
          🕒 지금
        </button>
      </div>

      <TimePickerModal
        open={showTimeModal}
        year={y}
        month={mo}
        day={d}
        hour={h}
        minute={mi}
        onClose={() => setShowTimeModal(false)}
        onConfirm={(nmo, nd, nh, nm) => onChange(fmt(y, nmo, nd, nh, nm))}
      />
    </div>
  );
}
