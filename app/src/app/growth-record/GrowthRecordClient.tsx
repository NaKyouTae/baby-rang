'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { useChildren, type Child } from '@/hooks/useChildren';
import EmptyChildState from '@/components/EmptyChildState';
import {
  ALL_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  summarizeRecord,
} from './types';
import EntrySheet from './EntrySheet';
import ChildSelector from '@/components/ChildSelector';
import DatePickerModal from '@/components/DatePickerModal';

const DEFAULT_QUICK_TYPES: GrowthType[] = ['FORMULA', 'SLEEP', 'DIAPER'];
const QUICK_LONG_PRESS_MS = 500;
const MAX_QUICK_TYPES = Infinity;

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours();
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${pad(d.getMinutes())}`;
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
  }
  const today = todayString();
  let dayLengthMin: number;
  if (date === today) {
    const now = new Date();
    dayLengthMin =
      now.getHours() * 60 + now.getMinutes();
  } else {
    dayLengthMin = 24 * 60;
  }
  const awakeMin = Math.max(0, dayLengthMin - sleepMin);
  return { sleepMin, awakeMin, feedingMl };
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
  const [showAllPicker, setShowAllPicker] = useState(false);
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

  // 첫 진입 시 자동 선택
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
      // earliest 이전이면 종료
      if (!earliestDate) {
        setHasMore(false);
        return;
      }
      let localCursor = cursor;
      let foundAny = false;
      // 빈 페이지는 건너뛰며 데이터가 나오거나 earliest를 지날 때까지 계속 조회
      // (한 호출에서 최대 안전 가드 60일까지)
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
        // 데이터가 없고, 다음 커서가 earliest보다 이전이면 종료
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

  // 자식 선택/변경 시 초기화 & 첫 로드 — BFF로 한 번에 가져오기
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
        // BFF: quick-buttons + earliest + range 를 Vercel Function 1개에서 병렬 처리
        const res = await fetch(
          `/api/growth-records/page-init?childId=${selectedChild.id}&from=${from}&to=${to}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          // quick buttons
          const types: GrowthType[] = (data.quickButtons ?? []).filter(
            (t: GrowthType) => TYPE_CONFIG[t],
          );
          setQuickTypes(types.length > 0 ? types : DEFAULT_QUICK_TYPES);
          // earliest
          const earliest = data.earliestDate ?? null;
          setEarliestDate(earliest);
          // records — range API 응답을 날짜별로 그룹핑
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

      // fallback: 개별 호출
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

  const fetchQuick = useCallback(async () => {
    try {
      const res = await fetch('/api/growth-quick-buttons');
      if (res.ok) {
        const json = await res.json();
        const types: GrowthType[] = (json.types ?? []).filter(
          (t: GrowthType) => TYPE_CONFIG[t],
        );
        setQuickTypes(types.length > 0 ? types : DEFAULT_QUICK_TYPES);
        return;
      }
    } catch {
      /* noop */
    }
    setQuickTypes(DEFAULT_QUICK_TYPES);
  }, []);

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
    }, QUICK_LONG_PRESS_MS);
  }, []);

  const clearQuickLongPress = useCallback(() => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  // tap outside to exit edit mode
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

  // fetchQuick은 BFF page-init에서 처리됨 — fallback/reload 시에만 개별 호출

  // 무한 스크롤 옵저버
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

  return (
    <div className="flex flex-col min-h-dvh bg-white px-6">
      <div ref={titleBarRef} className="sticky top-0 z-20 bg-white -mx-6 px-6 pb-3" style={{ paddingTop: 'calc(var(--safe-area-top) + 24px)' }}>
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />

        {(() => {
          const nowMs = Date.now();
          const lastDiaper = findLatestByTypes(sortedDays, ['DIAPER']);
          const lastFeed = findLatestByTypes(sortedDays, FEEDING_TYPES);
          const lastSleep = findLatestByTypes(sortedDays, ['SLEEP']);
          const Item = ({
            emoji,
            label,
            rec,
          }: {
            emoji: string;
            label: string;
            rec: GrowthRecord | null;
          }) => (
            <div className="flex-1 bg-white rounded-xl px-2.5 py-2 shadow-sm">
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span>{emoji}</span>
                <span>{label}</span>
              </div>
              <p className="text-[12px] font-bold text-gray-900 mt-0.5 tabular-nums">
                {rec ? formatAgo(rec.startAt, nowMs) : '기록 없음'}
              </p>
            </div>
          );
          return (
            <div className="flex items-stretch gap-2 mt-2">
              <Item emoji="🩲" label="마지막 기저귀" rec={lastDiaper} />
              <Item emoji="🍼" label="마지막 수유" rec={lastFeed} />
              <Item emoji="😴" label="마지막 수면" rec={lastSleep} />
            </div>
          );
        })()}
      </div>

      {/* 타임라인 - 날짜별 세로 나열 + 무한 스크롤 */}
      <main className="flex-1 pb-56">
        {initialLoading && sortedDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : sortedDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            아직 기록이 없어요.<br />
            아래 버튼으로 첫 기록을 남겨보세요.
          </div>
        ) : (
          <div className="pt-2">
            {sortedDays.map((group) => (
              <section key={group.date} className="mb-6">
                <div
                  className="sticky z-10 bg-gray-50 py-2 flex items-center justify-between gap-2"
                  style={{ top: titleBarH - 4 }}
                >
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="text-sm font-bold text-gray-900 shrink-0 flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded-md active:bg-gray-100"
                    aria-label="다른 날짜 선택"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>
                      {group.date.replace(/-/g, '. ')}.
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {['일', '월', '화', '수', '목', '금', '토'][new Date(`${group.date}T00:00:00`).getDay()]}요일
                      </span>
                    </span>
                  </button>
                  {(() => {
                    const stats = computeDayStats(group.records, group.date);
                    return (
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 tabular-nums">
                        <span className="flex items-center gap-0.5">
                          <span>😴</span>
                          <span>{formatDuration(stats.sleepMin)}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span>👀</span>
                          <span>{formatDuration(stats.awakeMin)}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span>🍼</span>
                          <span>{stats.feedingMl}ml</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="relative pl-6 pt-2">
                  <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-gray-200" />
                  {group.records.map((r) => {
                    const cfg = TYPE_CONFIG[r.type];
                    const summary = summarizeRecord(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setEditing(r);
                          setSheetType(r.type);
                        }}
                        className="relative w-full text-left mb-3 block"
                      >
                        <span className="absolute -left-[19px] top-3 w-3 h-3 rounded-full bg-white border-2 border-gray-900" />
                        <div className="bg-white rounded-2xl p-3.5 shadow-sm active:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${cfg.color}`}
                            >
                              {cfg.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-bold text-gray-900">
                                  {cfg.label}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatTime(r.startAt)}
                                  {cfg.hasEnd && r.endAt
                                    ? ` ~ ${formatTime(r.endAt)}`
                                    : ''}
                                </p>
                              </div>
                              {summary && (
                                <p className="text-xs text-gray-500 mt-0.5">{summary}</p>
                              )}
                              {r.memo && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {r.memo}
                                </p>
                              )}
                              {(() => {
                                const urls = r.imageUrls && r.imageUrls.length > 0
                                  ? r.imageUrls
                                  : r.imageUrl
                                    ? [r.imageUrl]
                                    : [];
                                if (urls.length === 0) return null;
                                return (
                                  <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                                    {urls.map((u: string) => (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        key={u}
                                        src={u}
                                        alt=""
                                        className="shrink-0 w-20 h-20 object-cover rounded-lg"
                                      />
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
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

      {/* 간편 버튼 바 — 하단 네비게이션 위 여백 유지 */}
      <div
        data-quick-bar-root
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-6 pointer-events-none"
        style={{ bottom: 'calc(max(var(--safe-area-bottom), 16px) + 72px)' }}
      >
        {editQuickMode && (
          <div className="mb-4 flex justify-center pointer-events-auto">
            <button
              type="button"
              onClick={() => setEditQuickMode(false)}
              className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold shadow"
            >
              완료
            </button>
          </div>
        )}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg pointer-events-auto flex items-stretch overflow-hidden">
          {/* 스크롤 영역: 간편 버튼들 */}
          <div
            className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
            style={{
              scrollbarWidth: 'none',
              maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
            }}
          >
            <div className="inline-flex gap-1 p-1.5">
              <Reorder.Group
                axis="x"
                as="div"
                values={quickTypes}
                onReorder={(next: GrowthType[]) => persistQuick(next)}
                className="flex"
              >
                {quickTypes.map((t) => {
                  const cfg = TYPE_CONFIG[t];
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
                      className="relative shrink-0 w-[60px] px-0.5"
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
                        className={`w-full flex flex-col items-center gap-0.5 py-1.5 rounded-lg ${cfg.color}`}
                      >
                        <span className="text-base leading-none">{cfg.emoji}</span>
                        <span className="text-[9px] font-semibold">{cfg.label}</span>
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
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-800 text-white flex items-center justify-center shadow z-10"
                          aria-label="삭제"
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                            <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </div>
          {/* 고정 + 버튼 */}
          <button
            type="button"
            onClick={() => setShowAddQuick(true)}
            className="shrink-0 w-11 flex items-center justify-center border-l border-gray-100 text-gray-400 rounded-r-2xl active:bg-gray-50"
            aria-label="간편 버튼 추가"
          >
            <span className="text-xl leading-none">+</span>
          </button>
        </div>
      </div>

      
      {/* 전체 항목 선택 */}
      {showAllPicker && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAllPicker(false)}
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col pb-[var(--safe-area-bottom)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">기록 추가</h2>
              <button
                onClick={() => setShowAllPicker(false)}
                className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_CONFIG) as GrowthType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setShowAllPicker(false);
                      setEditing(null);
                      setSheetType(t);
                    }}
                    className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-gray-50 active:bg-gray-100"
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
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
              {ALL_TYPES.map((t) => {
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
