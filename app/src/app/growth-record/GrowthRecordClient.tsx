'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelectedChild } from '@/hooks/useChildren';
import EmptyChildState from '@/components/EmptyChildState';
import {
  MENU_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  RECORD_ICONS,
  CATEGORY_STYLE,
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
  'MEDICATION',
  'DIAPER',
  'TEMPERATURE',
];

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

const PAGE_SIZE = 30;

type DayGroup = { date: string; records: GrowthRecord[] };

export default function GrowthRecordPage() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const [days, setDays] = useState<DayGroup[]>([]);
  const [cursor, setCursor] = useState<string>(todayString());
  const [hasMore, setHasMore] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [quickTypes, setQuickTypes] = useState<GrowthType[]>(DEFAULT_QUICK_TYPES);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheetType, setSheetType] = useState<GrowthType | null>(null);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [showAddQuick, setShowAddQuick] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
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
        // init이 아직 earliestDate를 설정하지 않은 상태에서 sentinel이
        // 일찍 마운트되어 호출될 수 있음. 여기서 hasMore를 끄지 않고
        // init이 정확한 값으로 처리하도록 그냥 종료한다.
        return;
      }
      let localCursor = cursor;
      // 데이터가 나올 때까지 또는 earliestDate에 도달할 때까지 range API로 청크 단위 조회
      for (let safety = 0; safety < 12; safety++) {
        if (localCursor < earliestDate) {
          setHasMore(false);
          break;
        }
        const to = localCursor;
        const fromCandidate = shiftDate(to, -(PAGE_SIZE - 1));
        const from = fromCandidate < earliestDate ? earliestDate : fromCandidate;
        const res = await fetch(
          `/api/growth-records/range?childId=${encodeURIComponent(selectedChild.id)}&from=${from}&to=${to}`,
        );
        const records: GrowthRecord[] = res.ok ? await res.json() : [];
        const dateMap = new Map<string, GrowthRecord[]>();
        for (const r of records) {
          const dt = new Date(r.startAt);
          const pad = (n: number) => String(n).padStart(2, '0');
          const d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
          if (!dateMap.has(d)) dateMap.set(d, []);
          dateMap.get(d)!.push(r);
        }
        const grouped = Array.from(dateMap.entries())
          .map(([date, recs]) => ({ date, records: recs }))
          .sort((a, b) => b.date.localeCompare(a.date));
        if (grouped.length > 0) {
          setDays((prev) => [...prev, ...grouped]);
        }
        const nextCursor = shiftDate(from, -1);
        localCursor = nextCursor;
        setCursor(localCursor);
        if (grouped.length > 0) break;
        if (localCursor < earliestDate) {
          setHasMore(false);
          break;
        }
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [selectedChild, cursor, hasMore, earliestDate]);

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
          const saved: GrowthType[] = (data.quickButtons ?? []).filter(
            (t: GrowthType) => (MENU_TYPES as string[]).includes(t),
          );
          setQuickTypes(saved.length > 0 ? saved : DEFAULT_QUICK_TYPES);
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
    const start = fromDate ?? todayString();
    const from = shiftDate(start, -(PAGE_SIZE - 1));
    const to = start;
    try {
      const res = await fetch(
        `/api/growth-records/page-init?childId=${encodeURIComponent(selectedChild.id)}&from=${from}&to=${to}`,
      );
      if (res.ok) {
        const data = await res.json();
        const earliest: string | null = data.earliestDate ?? null;
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
        const grouped = Array.from(dateMap.entries())
          .map(([date, recs]) => ({ date, records: recs }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setDays(grouped);
        const nextCursor = shiftDate(from, -1);
        setCursor(nextCursor);
        if (!earliest || nextCursor < earliest) setHasMore(false);
      }
    } finally {
      setInitialLoading(false);
    }
  }, [selectedChild]);

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

  // 페이지 복귀(브라우저 탭 전환, bfcache 복원 등) 시 데이터 재로드
  useEffect(() => {
    if (!selectedChild) return;
    const onPageShow = () => reload();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selectedChild, reload]);

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

  const visibleQuickTypes = useMemo(
    () => DEFAULT_QUICK_TYPES.filter((t) => quickTypes.includes(t)),
    [quickTypes],
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
          onSelect={selectChild}
        />

        {/* 카테고리 가로 스크롤 */}
        <div data-quick-bar-root className="-mx-6 mt-3">
          <div
            className="overflow-x-auto no-scrollbar pl-6 pr-6"
            style={{
              scrollbarWidth: 'none',
              maskImage:
                'linear-gradient(to right, black, black calc(100% - 24px), transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, black, black calc(100% - 24px), transparent)',
            }}
          >
            <div className="inline-flex items-start gap-[10px] py-1 align-top">
              {visibleQuickTypes.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const style = CATEGORY_STYLE[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setSheetType(t);
                    }}
                    className="flex flex-col items-center gap-[4px] shrink-0"
                  >
                    <div
                      className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
                      style={{ borderColor: style.border, backgroundColor: style.bg }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={RECORD_ICONS[t]}
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-[10px] font-normal text-gray-500 whitespace-nowrap">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
              {/* 설정 버튼 */}
              <button
                type="button"
                onClick={() => setShowAddQuick(true)}
                className="flex flex-col items-center gap-[4px] shrink-0"
                aria-label="기록 항목 설정"
              >
                <div
                  className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
                  style={{
                    borderColor: '#BBC0C5',
                    backgroundColor: 'rgba(187, 192, 197, 0.05)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-settings.svg"
                    alt=""
                    width={24}
                    height={24}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[10px] font-normal text-gray-500">설정</span>
              </button>
            </div>
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
            <div className="flex-1 flex flex-col items-center justify-center gap-[6px] py-[10px] rounded-[4px] bg-gray-100 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-500">{label}</p>
              <p className="text-[12px] font-semibold text-primary-500 tabular-nums">
                {rec ? formatAgo(rec.startAt, nowMs) : '-'}
              </p>
            </div>
          );
          return (
            <div className="flex items-stretch gap-[10px] mt-[10px]">
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
        ) : sortedDays.length === 0 && !hasMore ? (
          <div className="py-16 text-center text-sm text-gray-400">
            아직 기록이 없어요.<br />
            위 버튼으로 첫 기록을 남겨보세요.
          </div>
        ) : sortedDays.length === 0 ? (
          <div ref={sentinelRef} className="py-16 text-center text-sm text-gray-400">
            {loadingMore ? '이전 기록을 불러오는 중...' : '이전 기록을 찾는 중...'}
          </div>
        ) : (
          <div className="mt-[24px] rounded-[8px] border border-gray-200 bg-white">
            {sortedDays.map((group) => {
              const stats = computeDayStats(group.records, group.date);
              const isToday = group.date === today;
              const dDay = selectedChild.birthDate
                ? dayOfLife(selectedChild.birthDate, group.date)
                : null;
              return (
                <section key={group.date} className="mb-2">
                  <div
                    className="sticky z-10 bg-white px-4 py-3 border-b border-dotted border-gray-200"
                    style={{ top: titleBarH - 4 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(true)}
                        className="flex items-center gap-[2px] -ml-1 px-1 py-0.5 rounded-md active:bg-gray-100"
                        aria-label="다른 날짜 선택"
                      >
                        <span className="text-[12px] font-semibold text-gray-900">{formatHeaderDate(group.date)}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                      <span className="text-[12px] font-normal text-gray-900 tabular-nums">
                        {isToday ? '오늘' : dDay !== null ? `D ${dDay}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-[10px] mt-[10px] tabular-nums">
                      <span className="flex items-center gap-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-stat-awake.svg" alt="" width={16} height={16} aria-hidden="true" />
                        <span className="text-[10px] font-medium text-gray-900">{formatDuration(stats.awakeMin)}</span>
                      </span>
                      <span className="flex items-center gap-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-stat-sleep.svg" alt="" width={16} height={16} aria-hidden="true" />
                        <span className="text-[10px] font-medium text-gray-900">{formatDuration(stats.sleepMin)}</span>
                      </span>
                      <span className="flex items-center gap-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-stat-feeding.svg" alt="" width={16} height={16} aria-hidden="true" />
                        <span className="text-[10px] font-medium text-gray-900">
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
                      const catStyle = CATEGORY_STYLE[r.type] ?? CATEGORY_STYLE.ETC;
                      const summary = summarizeRecord(r);
                      const title =
                        r.type === 'SLEEP'
                          ? ((r.data as Record<string, unknown> | null)?.kind === 'NIGHT'
                              ? '밤잠'
                              : '낮잠')
                          : cfg.label;
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
                          className="w-full text-left flex items-start px-4 py-3 border-b border-dotted border-gray-200 last:border-b-0 active:bg-gray-50"
                        >
                          <span
                            className="inline-flex items-center justify-center px-1.5 rounded-[4px] text-[10px] font-semibold tabular-nums shrink-0 mt-0.5"
                            style={{
                              height: 16,
                              backgroundColor: catStyle.bg,
                              color: catStyle.border,
                            }}
                          >
                            {formatTime24(r.startAt)}
                          </span>
                          <span
                            className="ml-[24px] mt-[7px] rounded-full shrink-0"
                            style={{
                              width: 6,
                              height: 6,
                              backgroundColor: catStyle.border,
                            }}
                          />
                          <div className="ml-2 flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-gray-900 leading-snug">
                              {title}
                            </p>
                            {summary && (
                              <p className="text-[12px] font-normal text-gray-500 mt-2">{summary}</p>
                            )}
                            {r.memo && (
                              <p className="text-[11px] text-gray-600 mt-2 line-clamp-2">
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
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-400 ml-2 mt-0.5 shrink-0"
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
            {hasMore && (
              <div ref={sentinelRef} className="py-6 text-center text-xs text-gray-400">
                {loadingMore ? '불러오는 중...' : ''}
              </div>
            )}
          </div>
        )}
      </main>

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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={RECORD_ICONS[t]}
                      alt=""
                      width={32}
                      height={32}
                      aria-hidden="true"
                    />
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
