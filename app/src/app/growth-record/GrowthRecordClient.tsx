'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { useChildren, type Child } from '@/hooks/useChildren';
import EmptyChildState from '@/components/EmptyChildState';
import {
  MENU_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  summarizeRecord,
} from './types';
import EntrySheet from './EntrySheet';
import ChildSelector from '@/components/ChildSelector';
import DatePickerModal from '@/components/DatePickerModal';

const DEFAULT_QUICK_TYPES: GrowthType[] = [
  'FORMULA',
  'BREASTFEEDING',
  'PUMPED_FEEDING',
  'PUMPING',
  'BABY_FOOD',
  'SLEEP',
  'BATH',
];
const QUICK_LONG_PRESS_MS = 500;

const ACCENT: Record<GrowthType, { time: string; dot: string; border: string }> = {
  FORMULA: { time: 'text-rose-500', dot: 'bg-rose-400', border: 'border-rose-300' },
  BREASTFEEDING: { time: 'text-pink-600', dot: 'bg-pink-400', border: 'border-pink-300' },
  PUMPED_FEEDING: { time: 'text-amber-500', dot: 'bg-amber-400', border: 'border-amber-300' },
  PUMPING: { time: 'text-emerald-500', dot: 'bg-emerald-400', border: 'border-emerald-300' },
  SLEEP: { time: 'text-blue-500', dot: 'bg-blue-400', border: 'border-blue-300' },
  BATH: { time: 'text-cyan-500', dot: 'bg-cyan-400', border: 'border-cyan-300' },
  MEDICATION: { time: 'text-purple-500', dot: 'bg-purple-400', border: 'border-purple-300' },
  DIAPER: { time: 'text-gray-700', dot: 'bg-gray-500', border: 'border-yellow-300' },
  BABY_FOOD: { time: 'text-teal-500', dot: 'bg-teal-400', border: 'border-teal-300' },
  MILK: { time: 'text-blue-500', dot: 'bg-blue-400', border: 'border-blue-300' },
  WATER: { time: 'text-sky-500', dot: 'bg-sky-400', border: 'border-sky-300' },
  HOSPITAL: { time: 'text-red-500', dot: 'bg-red-400', border: 'border-red-300' },
  TEMPERATURE: { time: 'text-rose-500', dot: 'bg-rose-400', border: 'border-rose-300' },
  SNACK: { time: 'text-amber-600', dot: 'bg-amber-500', border: 'border-amber-300' },
  PLAY: { time: 'text-emerald-600', dot: 'bg-emerald-400', border: 'border-emerald-300' },
  TUMMY_TIME: { time: 'text-teal-500', dot: 'bg-teal-400', border: 'border-teal-300' },
  ETC: { time: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-300' },
};

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime24(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatHeaderDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${dow})`;
}

function dayOfLife(birthDate: string, date: string): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.floor((target.getTime() - birth.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

const FEEDING_TYPES: GrowthType[] = [
  'BREASTFEEDING',
  'FORMULA',
  'PUMPED_FEEDING',
  'MILK',
];

function formatDuration(mins: number): string {
  if (mins <= 0) return '0분';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function computeDayStats(records: GrowthRecord[], date: string) {
  let sleepMin = 0;
  let feedingMl = 0;
  let breastMin = 0;
  for (const r of records) {
    if (r.type === 'SLEEP' && r.endAt) {
      sleepMin += Math.max(
        0,
        Math.round(
          (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 60000,
        ),
      );
    }
    if (r.type === 'FORMULA' || r.type === 'PUMPED_FEEDING' || r.type === 'MILK') {
      const ml = Number((r.data as Record<string, unknown>)?.amountMl);
      if (!Number.isNaN(ml)) feedingMl += ml;
    }
    if (r.type === 'BREASTFEEDING') {
      const data = (r.data ?? {}) as Record<string, unknown>;
      const left = Number(data.leftMin) || 0;
      const right = Number(data.rightMin) || 0;
      breastMin += left + right;
    }
  }
  const today = todayString();
  let dayLengthMin: number;
  if (date === today) {
    const now = new Date();
    dayLengthMin = now.getHours() * 60 + now.getMinutes();
  } else {
    dayLengthMin = 24 * 60;
  }
  const awakeMin = Math.max(0, dayLengthMin - sleepMin);
  return { sleepMin, awakeMin, feedingMl, breastMin };
}

function findLatestByTypes(
  days: { date: string; records: GrowthRecord[] }[],
  types: GrowthType[],
): GrowthRecord | null {
  let latest: GrowthRecord | null = null;
  for (const g of days) {
    for (const r of g.records) {
      if (!types.includes(r.type)) continue;
      if (!latest || new Date(r.startAt).getTime() > new Date(latest.startAt).getTime()) {
        latest = r;
      }
    }
  }
  return latest;
}

function formatAgo(iso: string, nowMs: number): string {
  const diffMin = Math.max(
    0,
    Math.floor((nowMs - new Date(iso).getTime()) / 60000),
  );
  return `${formatDuration(diffMin)} 전`;
}

const PAGE_SIZE = 3;

type DayGroup = { date: string; records: GrowthRecord[] };

export default function GrowthRecordPage() {
  const { children, isLoaded } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [days, setDays] = useState<DayGroup[]>([]);
  const [cursor, setCursor] = useState<string>(todayString());
  const [hasMore, setHasMore] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [quickTypes, setQuickTypes] = useState<GrowthType[]>(DEFAULT_QUICK_TYPES);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheetType, setSheetType] = useState<GrowthType | null>(null);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [showAddQuick, setShowAddQuick] = useState(false);
  const [editQuickMode, setEditQuickMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const titleBarRef = useRef<HTMLDivElement | null>(null);
  const [titleBarH, setTitleBarH] = useState(84);

  useEffect(() => {
    const el = titleBarRef.current;
    if (!el) return;
    const update = () => setTitleBarH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isLoaded && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [isLoaded, children, selectedChild]);

  const fetchDay = useCallback(
    async (childId: string, d: string): Promise<GrowthRecord[]> => {
      const res = await fetch(`/api/growth-records?childId=${childId}&date=${d}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!selectedChild || loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      if (!earliestDate) {
        setHasMore(false);
        return;
      }
      let localCursor = cursor;
      let foundAny = false;
      for (let safety = 0; safety < 20; safety++) {
        if (localCursor < earliestDate) {
          setHasMore(false);
          break;
        }
        const targets: string[] = [];
        for (let i = 0; i < PAGE_SIZE; i++) {
          targets.push(shiftDate(localCursor, -i));
        }
        const results = await Promise.all(
          targets.map((d) =>
            fetchDay(selectedChild.id, d).then((records) => ({ date: d, records })),
          ),
        );
        const next = results.filter((g) => g.records.length > 0);
        if (next.length > 0) {
          setDays((prev) => [...prev, ...next]);
          foundAny = true;
        }
        const nextCursor = shiftDate(targets[targets.length - 1], -1);
        localCursor = nextCursor;
        setCursor(localCursor);
        if (foundAny) break;
        if (localCursor < earliestDate) {
          setHasMore(false);
          break;
        }
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [selectedChild, cursor, hasMore, fetchDay, earliestDate]);

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;
    const init = async () => {
      setInitialLoading(true);
      setDays([]);
      setHasMore(true);
      const today = todayString();
      const targets: string[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) targets.push(shiftDate(today, -i));
      const from = targets[targets.length - 1];
      const to = today;

      try {
        const res = await fetch(
          `/api/growth-records/page-init?childId=${selectedChild.id}&from=${from}&to=${to}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const types: GrowthType[] = (data.quickButtons ?? []).filter(
            (t: GrowthType) => TYPE_CONFIG[t],
          );
          setQuickTypes(types.length > 0 ? types : DEFAULT_QUICK_TYPES);
          const earliest = data.earliestDate ?? null;
          setEarliestDate(earliest);
          const allRecords: GrowthRecord[] = data.records ?? [];
          const dateMap = new Map<string, GrowthRecord[]>();
          for (const r of allRecords) {
            const dt = new Date(r.startAt);
            const pad = (n: number) => String(n).padStart(2, '0');
            const d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
            if (!dateMap.has(d)) dateMap.set(d, []);
            dateMap.get(d)!.push(r);
          }
          const grouped = targets
            .map((d) => ({ date: d, records: dateMap.get(d) ?? [] }))
            .filter((g) => g.records.length > 0);
          setDays(grouped);
          const nextCursor = shiftDate(from, -1);
          setCursor(nextCursor);
          if (!earliest || nextCursor < earliest) setHasMore(false);
          setInitialLoading(false);
          return;
        }
      } catch {
        /* BFF 실패 시 fallback */
      }

      const earliestPromise = fetch(
        `/api/growth-records/earliest?childId=${selectedChild.id}`,
      )
        .then((r) => (r.ok ? r.json() : { date: null }))
        .then((j) => (j?.date as string | null) ?? null)
        .catch(() => null);
      const [earliest, results] = await Promise.all([
        earliestPromise,
        Promise.all(
          targets.map((d) =>
            fetchDay(selectedChild.id, d).then((records) => ({ date: d, records })),
          ),
        ),
      ]);
      if (cancelled) return;
      setEarliestDate(earliest);
      const next = results.filter((g) => g.records.length > 0);
      setDays(next);
      const nextCursor = shiftDate(targets[targets.length - 1], -1);
      setCursor(nextCursor);
      if (!earliest || nextCursor < earliest) setHasMore(false);
      setInitialLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [selectedChild, fetchDay]);

  const reload = useCallback(async (fromDate?: string) => {
    if (!selectedChild) return;
    setDays([]);
    setHasMore(true);
    setInitialLoading(true);
    const earliestPromise = fetch(
      `/api/growth-records/earliest?childId=${selectedChild.id}`,
    )
      .then((r) => (r.ok ? r.json() : { date: null }))
      .then((j) => (j?.date as string | null) ?? null)
      .catch(() => null);
    const start = fromDate ?? todayString();
    const targets: string[] = [];
    for (let i = 0; i < PAGE_SIZE; i++) targets.push(shiftDate(start, -i));
    const [earliest, results] = await Promise.all([
      earliestPromise,
      Promise.all(
        targets.map((d) =>
          fetchDay(selectedChild.id, d).then((records) => ({ date: d, records })),
        ),
      ),
    ]);
    setEarliestDate(earliest);
    const next = results.filter((g) => g.records.length > 0);
    setDays(next);
    const nextCursor = shiftDate(targets[targets.length - 1], -1);
    setCursor(nextCursor);
    if (!earliest || nextCursor < earliest) setHasMore(false);
    setInitialLoading(false);
  }, [selectedChild, fetchDay]);

  const persistQuick = useCallback(async (next: GrowthType[]) => {
    setQuickTypes(next);
    try {
      await fetch('/api/growth-quick-buttons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: next }),
      });
    } catch {
      /* noop — optimistic */
    }
  }, []);

  const startQuickLongPress = useCallback(() => {
    if (longPressRef.current !== null) window.clearTimeout(longPressRef.current);
    longPressRef.current = window.setTimeout(() => {
      setEditQuickMode(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate?.(20); } catch {}
      }
    }, QUICK_LONG_PRESS_MS);
  }, []);

  const clearQuickLongPress = useCallback(() => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editQuickMode) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-quick-bar-root]') && !target.closest('[data-quick-add-sheet]')) {
        setEditQuickMode(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [editQuickMode]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const sortedDays = useMemo(
    () =>
      days.map((g) => ({
        date: g.date,
        records: [...g.records].sort(
          (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
        ),
      })),
    [days],
  );

  if (!isLoaded) return null;

  if (children.length === 0) {
    return (
      <EmptyChildState
        emoji="📒"
        title="기록"
        description={
          <>
            아기를 등록하면<br />
            매일의 기록을 남길 수 있어요.
          </>
        }
      />
    );
  }

  if (!selectedChild) return null;

  const today = todayString();

  return (
    <div className="flex flex-col min-h-dvh bg-white px-6">
      {/* 상단 헤더: 자식 선택 + 카테고리 + 마지막 기록 카드 */}
      <div
        ref={titleBarRef}
        className="sticky top-0 z-20 bg-white -mx-6 px-6 pb-3"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 24px)' }}
      >
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />

        {/* 카테고리 가로 스크롤 */}
        <div data-quick-bar-root className="-mx-6 mt-3">
          <div
            className="overflow-x-auto no-scrollbar pl-6 pr-2"
            style={{
              scrollbarWidth: 'none',
              maskImage:
                'linear-gradient(to right, black, black calc(100% - 24px), transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, black, black calc(100% - 24px), transparent)',
            }}
          >
            <Reorder.Group
              axis="x"
              as="div"
              values={quickTypes}
              onReorder={(next: GrowthType[]) => persistQuick(next)}
              className="inline-flex items-start gap-3 py-1 align-top"
            >
              {quickTypes.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const accent = ACCENT[t];
                return (
                  <Reorder.Item
                    key={t}
                    value={t}
                    as="div"
                    drag={editQuickMode ? 'x' : false}
                    dragListener={editQuickMode}
                    onDragStart={() => { draggingRef.current = true; }}
                    onDragEnd={() => { setTimeout(() => { draggingRef.current = false; }, 0); }}
                    whileDrag={{ scale: 1.05, zIndex: 10 }}
                    transition={{ layout: { duration: 0 } }}
                    style={{ touchAction: editQuickMode ? 'none' : 'auto' }}
                    className="relative shrink-0"
                  >
                    <button
                      type="button"
                      onPointerDown={() => { if (!editQuickMode) startQuickLongPress(); }}
                      onPointerUp={clearQuickLongPress}
                      onPointerCancel={clearQuickLongPress}
                      onPointerLeave={clearQuickLongPress}
                      onClick={(e) => {
                        if (draggingRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        if (editQuickMode) {
                          e.preventDefault();
                          return;
                        }
                        setEditing(null);
                        setSheetType(t);
                      }}
                      className="flex flex-col items-center gap-1 w-14"
                    >
                      <div
                        className={`w-12 h-12 rounded-full bg-white border-2 ${accent.border} flex items-center justify-center text-xl active:scale-95 transition-transform`}
                      >
                        {cfg.emoji}
                      </div>
                      <span className="text-[10px] text-gray-700 font-medium truncate max-w-full">
                        {cfg.label}
                      </span>
                    </button>
                    {editQuickMode && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          persistQuick(quickTypes.filter((x) => x !== t));
                        }}
                        className="absolute -top-0.5 right-0 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center shadow z-10"
                        aria-label="삭제"
                      >
                        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                          <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </Reorder.Item>
                );
              })}
              {/* + 버튼 */}
              <button
                type="button"
                onClick={() => setShowAddQuick(true)}
                className="flex flex-col items-center gap-1 w-14 shrink-0"
                aria-label="간편 버튼 추가"
              >
                <div className="w-12 h-12 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-xl text-gray-400 active:scale-95 transition-transform">
                  +
                </div>
                <span className="text-[10px] text-gray-400 font-medium">추가</span>
              </button>
            </Reorder.Group>
          </div>
        </div>

        {/* 마지막 기록 3종 카드 */}
        {(() => {
          const nowMs = Date.now();
          const lastFeed = findLatestByTypes(sortedDays, FEEDING_TYPES);
          const lastSleep = findLatestByTypes(sortedDays, ['SLEEP']);
          const lastDiaper = findLatestByTypes(sortedDays, ['DIAPER']);
          const Item = ({
            label,
            rec,
          }: {
            label: string;
            rec: GrowthRecord | null;
          }) => (
            <div className="flex-1 bg-gray-50 rounded-xl px-2.5 py-2">
              <p className="text-[10px] text-gray-500 text-center">{label}</p>
              <p className="text-[12px] font-bold text-gray-900 text-center mt-0.5 tabular-nums">
                {rec ? formatAgo(rec.startAt, nowMs) : '기록 없음'}
              </p>
            </div>
          );
          return (
            <div className="flex items-stretch gap-2 mt-3">
              <Item label="마지막 수유" rec={lastFeed} />
              <Item label="마지막 수면" rec={lastSleep} />
              <Item label="마지막 기저귀" rec={lastDiaper} />
            </div>
          );
        })()}
      </div>

      {/* 타임라인 - 날짜별 세로 나열 + 무한 스크롤 */}
      <main className="flex-1 pb-32">
        {initialLoading && sortedDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : sortedDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            아직 기록이 없어요.<br />
            위 버튼으로 첫 기록을 남겨보세요.
          </div>
        ) : (
          <div className="pt-2">
            {sortedDays.map((group) => {
              const stats = computeDayStats(group.records, group.date);
              const isToday = group.date === today;
              const dDay = selectedChild.birthDate
                ? dayOfLife(selectedChild.birthDate, group.date)
                : null;
              return (
                <section key={group.date} className="mb-2">
                  <div
                    className="sticky z-10 bg-white py-3 border-b border-gray-100"
                    style={{ top: titleBarH - 4 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(true)}
                        className="flex items-center gap-1 text-sm font-bold text-gray-900 -ml-1 px-1 py-0.5 rounded-md active:bg-gray-100"
                        aria-label="다른 날짜 선택"
                      >
                        <span>{formatHeaderDate(group.date)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                      <span className="text-xs font-medium text-gray-400 tabular-nums">
                        {isToday ? '오늘' : dDay !== null ? `D ${dDay}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 tabular-nums">
                      <span className="flex items-center gap-1">
                        <span>☀️</span>
                        <span>{formatDuration(stats.awakeMin)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🌙</span>
                        <span>{formatDuration(stats.sleepMin)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🍼</span>
                        <span>
                          {stats.feedingMl}ml
                          {stats.breastMin > 0 ? ` +${stats.breastMin}분` : ''}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 기록 행 */}
                  <div>
                    {group.records.map((r) => {
                      const cfg = TYPE_CONFIG[r.type];
                      const accent = ACCENT[r.type];
                      const summary = summarizeRecord(r);
                      const urls =
                        r.imageUrls && r.imageUrls.length > 0
                          ? r.imageUrls
                          : r.imageUrl
                            ? [r.imageUrl]
                            : [];
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setEditing(r);
                            setSheetType(r.type);
                          }}
                          className="w-full text-left flex items-start gap-3 py-3 border-b border-dashed border-gray-100 active:bg-gray-50"
                        >
                          <span
                            className={`text-xs font-semibold tabular-nums w-10 shrink-0 pt-0.5 ${accent.time}`}
                          >
                            {formatTime24(r.startAt)}
                          </span>
                          <span
                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${accent.dot}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 leading-snug">
                              {cfg.label}
                            </p>
                            {summary && (
                              <p className="text-[11px] text-gray-500 mt-0.5">{summary}</p>
                            )}
                            {r.memo && (
                              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                                {r.memo}
                              </p>
                            )}
                            {urls.length > 0 && (
                              <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {urls.map((u: string) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={u}
                                    src={u}
                                    alt=""
                                    className="shrink-0 w-16 h-16 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-300 mt-1 shrink-0"
                            aria-hidden="true"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {hasMore ? (
              <div ref={sentinelRef} className="py-6 text-center text-xs text-gray-400">
                {loadingMore ? '불러오는 중...' : ''}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                저장된 기록이 더이상 없습니다.
              </div>
            )}
          </div>
        )}
      </main>

      {editQuickMode && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-6 pointer-events-none"
          style={{ bottom: 'calc(max(var(--safe-area-bottom), 16px) + 96px)' }}
        >
          <div className="flex justify-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setEditQuickMode(false)}
              className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold shadow"
            >
              완료
            </button>
          </div>
        </div>
      )}

      {sheetType && (
        <EntrySheet
          childId={selectedChild.id}
          type={sheetType}
          initial={editing}
          defaultDate={todayString()}
          onClose={() => {
            setSheetType(null);
            setEditing(null);
          }}
          onSaved={reload}
        />
      )}

      {showAddQuick && (
        <div
          data-quick-add-sheet
          className="fixed inset-0 z-[70] flex items-end justify-center"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddQuick(false)}
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col pb-[var(--safe-area-bottom)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">간편 버튼 추가</h2>
              <button
                onClick={() => setShowAddQuick(false)}
                className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 grid grid-cols-3 gap-2">
              {MENU_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const selected = quickTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      if (selected) {
                        persistQuick(quickTypes.filter((x) => x !== t));
                      } else {
                        persistQuick([...quickTypes, t]);
                      }
                    }}
                    className={`relative flex flex-col items-center gap-1 py-3 rounded-2xl transition ${
                      selected
                        ? 'bg-primary-50 ring-2 ring-primary-500'
                        : 'bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className={`text-xs font-medium ${selected ? 'text-primary-700' : 'text-gray-700'}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DatePickerModal
        open={showDatePicker}
        value={sortedDays[0]?.date ?? todayString()}
        min={earliestDate ?? undefined}
        max={todayString()}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d: string) => reload(d)}
      />
    </div>
  );
}
