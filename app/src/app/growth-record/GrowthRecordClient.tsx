'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelectedChild } from '@/hooks/useChildren';
import NoChildCard from '@/components/NoChildCard';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
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
import QuickTypeSettingsSheet from './QuickTypeSettingsSheet';
import { getCachedQuickTypes, setCachedQuickTypes } from './recordDefaults';
import ChildSelector from '@/components/ChildSelector';
import DatePickerModal from '@/components/DatePickerModal';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';

const SWIPE_DELETE_WIDTH = 59;
const SWIPE_OPEN_THRESHOLD = 30;

function SwipeableRow({
  open,
  onOpenChange,
  onDelete,
  children,
  isLast,
  rowId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
  isLast: boolean;
  rowId: string;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<'h' | 'v' | null>(null);
  const baseRef = useRef(0);
  const movedRef = useRef(false);
  const pointerDownRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const offset = dragging ? dragX : open ? -SWIPE_DELETE_WIDTH : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 마우스 좌클릭만 허용
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerDownRef.current = true;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseRef.current = open ? -SWIPE_DELETE_WIDTH : 0;
    lockedRef.current = null;
    movedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (lockedRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (lockedRef.current === 'h') {
        setDragging(true);
        setDragX(baseRef.current + dx);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (lockedRef.current === 'v') return;
    movedRef.current = true;
    let next = baseRef.current + dx;
    if (next > 0) next = 0;
    if (next < -SWIPE_DELETE_WIDTH) {
      next = -SWIPE_DELETE_WIDTH - (Math.abs(next + SWIPE_DELETE_WIDTH) * 0.3);
    }
    setDragX(next);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = false;
    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* ignore */
      }
      pointerIdRef.current = null;
    }
    if (lockedRef.current === 'h') {
      const shouldOpen = dragX < -SWIPE_OPEN_THRESHOLD;
      onOpenChange(shouldOpen);
      setDragX(shouldOpen ? -SWIPE_DELETE_WIDTH : 0);
      setDragging(false);
    }
    lockedRef.current = null;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
      return;
    }
    if (open) {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
    }
  };

  return (
    <div
      data-swipe-row
      data-row-id={rowId}
      className={`relative overflow-hidden bg-white border-b border-dotted border-gray-200 ${
        isLast ? 'border-b-0' : ''
      }`}
    >
      <button
        type="button"
        data-swipe-delete
        onClick={onDelete}
        aria-label="삭제"
        tabIndex={open ? 0 : -1}
        style={{ width: SWIPE_DELETE_WIDTH }}
        className="absolute top-0 right-0 bottom-0 bg-red-500 active:bg-red-600 flex items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-trash.svg"
          alt=""
          width={24}
          height={24}
          aria-hidden="true"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </button>
      <div
        className={`relative bg-white select-none ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{
          transform: `translateX(${offset}px)`,
          touchAction: 'pan-y',
          cursor: dragging ? 'grabbing' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

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

function computeDayStats(records: GrowthRecord[]) {
  // 해(낮잠): 수면의 낮잠(NAP) 타입 시작-종료 시간 합산
  // 달(밤잠): 수면의 밤잠(NIGHT) 타입 시작~(종료 시간 또는 현재 시간)까지 경과 시간
  let napMin = 0;
  let nightMin = 0;
  let formulaMl = 0;
  let pumpedMl = 0;
  let otherFeedingMl = 0;
  let breastMin = 0;
  const now = Date.now();
  for (const r of records) {
    if (r.type === 'SLEEP') {
      const kind = (r.data as Record<string, unknown> | null)?.kind;
      const start = new Date(r.startAt).getTime();
      // 종료 시간이 있으면 종료까지만, 없으면(진행 중) 현재 시간까지
      const end = r.endAt ? new Date(r.endAt).getTime() : now;
      const mins = Math.max(0, Math.round((end - start) / 60000));
      if (kind === 'NIGHT') nightMin += mins;
      else napMin += mins;
    }
    if (r.type === 'FORMULA' || r.type === 'PUMPED_FEEDING' || r.type === 'MILK') {
      const ml = Number((r.data as Record<string, unknown>)?.amountMl);
      if (!Number.isNaN(ml)) {
        if (r.type === 'FORMULA') formulaMl += ml;
        else if (r.type === 'PUMPED_FEEDING') pumpedMl += ml;
        else otherFeedingMl += ml;
      }
    }
    if (r.type === 'BREASTFEEDING') {
      const data = (r.data ?? {}) as Record<string, unknown>;
      const left = Number(data.leftMin) || 0;
      const leftS = Number(data.leftSec) || 0;
      const right = Number(data.rightMin) || 0;
      const rightS = Number(data.rightSec) || 0;
      breastMin += left + right + Math.round((leftS + rightS) / 60);
    }
  }
  const feedingMl = formulaMl + pumpedMl + otherFeedingMl;
  return { napMin, nightMin, feedingMl, formulaMl, pumpedMl, breastMin };
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
  const { openLoginPrompt } = useLoginPrompt();
  const [days, setDays] = useState<DayGroup[]>([]);
  const [cursor, setCursor] = useState<string>(todayString());
  const [hasMore, setHasMore] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [quickTypes, setQuickTypes] = useState<GrowthType[]>(() => {
    const cached = getCachedQuickTypes()?.filter(
      (t) => (MENU_TYPES as string[]).includes(t),
    ) as GrowthType[] | undefined;
    return cached && cached.length > 0 ? cached : DEFAULT_QUICK_TYPES;
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheetType, setSheetType] = useState<GrowthType | null>(null);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [showAddQuick, setShowAddQuick] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrowthRecord | null>(null);
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
          const nextQuick = saved.length > 0 ? saved : DEFAULT_QUICK_TYPES;
          setQuickTypes(nextQuick);
          setCachedQuickTypes(nextQuick);
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

  const deleteRecord = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/growth-records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDays((prev) =>
          prev
            .map((g) => ({ ...g, records: g.records.filter((r) => r.id !== id) }))
            .filter((g) => g.records.length > 0),
        );
        setSwipedRowId(null);
      }
    },
    [],
  );

  // 스와이프 열린 행 — 다른 곳(다른 행 포함)을 탭/클릭하거나 스크롤 시 닫기
  useEffect(() => {
    if (!swipedRowId) return;
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const row = target?.closest('[data-swipe-row]') as HTMLElement | null;
      // 현재 열린 행 내부 클릭이면 그대로 둠 (행 자체의 onClickCapture가 처리)
      if (row && row.dataset.rowId === swipedRowId) return;
      setSwipedRowId(null);
    };
    const onScroll = () => setSwipedRowId(null);
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScroll);
    };
  }, [swipedRowId]);

  const persistQuick = useCallback(async (next: GrowthType[]) => {
    setQuickTypes(next);
    setCachedQuickTypes(next);
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
        records: [...g.records].sort((a, b) => {
          const diff =
            new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
          if (diff !== 0) return diff;
          const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return cb - ca;
        }),
      })),
    [days],
  );

  const visibleQuickTypes = useMemo(
    () => quickTypes.filter((t) => (MENU_TYPES as string[]).includes(t)),
    [quickTypes],
  );

  if (!isLoaded) return null;

  const noChild = !selectedChild;
  const today = todayString();

  return (
    <div className="flex flex-col bg-white px-6">
      {/* 상단 고정 바 */}
      <div
        ref={titleBarRef}
        className="sticky top-0 z-30 bg-white -mx-6"
      >
        <PageHeader title="기록" variant="back" />
      </div>

      {/* 기록 메뉴 전체: 프로필 · 카테고리 · 지표 · 기록 리스트 (하나의 div, gap 16px) */}
      <main
        className="flex-1 flex flex-col gap-4 pt-2"
        style={{ paddingBottom: "186px" }}
      >
        {noChild ? (
          <NoChildCard loginMessage="로그인하고 우리 아기의 기록을 시작하세요." />
        ) : (
          <ChildSelector
            children={children}
            selected={selectedChild}
            onSelect={selectChild}
          />
        )}

        {/* 카테고리 가로 스크롤 */}
        <div data-quick-bar-root className="-mx-6">
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
                      if (noChild) {
                        openLoginPrompt('로그인하고 우리 아기의 기록을 시작하세요.');
                        return;
                      }
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
                onClick={() => {
                  if (noChild) {
                    openLoginPrompt('로그인하고 우리 아기의 기록을 시작하세요.');
                    return;
                  }
                  setShowAddQuick(true);
                }}
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
            <div className="flex items-stretch gap-[10px]">
              <Item label="마지막 수유" rec={lastFeed} />
              <Item label="마지막 수면" rec={lastSleep} />
              <Item label="마지막 기저귀" rec={lastDiaper} />
            </div>
          );
        })()}

        {/* 기록 리스트 (날짜 구분 + 통계 유지) */}
        {noChild ? (
          <div className="rounded-[8px] border border-dotted border-gray-200 px-5 py-12 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-empty-record.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden="true"
              />
            </div>
            <p className="mt-[10px] text-[14px] font-medium text-black">아직 등록된 기록이 없어요.</p>
            <p className="mt-[4px] text-[12px] font-normal text-gray-500">우리 아기의 하루를 기록해 보세요.</p>
            <button
              type="button"
              onClick={() => openLoginPrompt('로그인하고 우리 아기의 기록을 시작하세요.')}
              className="mt-[10px] inline-flex items-center justify-center px-3 h-6 rounded-[6px] text-[12px] font-semibold text-white bg-primary-500 active:opacity-80 transition-opacity"
            >
              데이터 가져오기
            </button>
          </div>
        ) : initialLoading && sortedDays.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : sortedDays.length === 0 && !hasMore ? (
          <div className="rounded-[8px] border border-dotted border-gray-200 px-5 py-12 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-empty-record.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden="true"
              />
            </div>
            <p className="mt-[10px] text-[14px] font-medium text-black">아직 등록된 기록이 없어요.</p>
            <p className="mt-[4px] text-[12px] font-normal text-gray-500">우리 아기의 하루를 기록해 보세요.</p>
            <Link
              href="/settings/import-data"
              className="mt-[10px] inline-flex items-center justify-center px-3 h-6 rounded-[6px] text-[12px] font-semibold text-white bg-primary-500 active:opacity-80 transition-opacity"
            >
              데이터 가져오기
            </Link>
          </div>
        ) : sortedDays.length === 0 ? (
          <div ref={sentinelRef} className="py-16 text-center text-sm text-gray-400">
            {loadingMore ? '이전 기록을 불러오는 중...' : '이전 기록을 찾는 중...'}
          </div>
        ) : (
          <div className="rounded-[8px] border border-gray-200 bg-white">
            {sortedDays.map((group) => {
              const stats = computeDayStats(group.records);
              const isToday = group.date === today;
              const dDay = selectedChild?.birthDate
                ? dayOfLife(selectedChild.birthDate, group.date)
                : null;
              return (
                <section key={group.date} className="mb-2 border-t border-gray-200 first:border-t-0">
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
                        {isToday ? '오늘' : dDay !== null ? `D+${dDay}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-[10px] mt-[10px] tabular-nums">
                      <span className="flex items-center gap-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-stat-awake.svg" alt="" width={16} height={16} aria-hidden="true" />
                        <span className="text-[10px] font-medium text-gray-900">{formatDuration(stats.napMin)}</span>
                      </span>
                      <span className="flex items-center gap-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon-stat-sleep.svg" alt="" width={16} height={16} aria-hidden="true" />
                        <span className="text-[10px] font-medium text-gray-900">{formatDuration(stats.nightMin)}</span>
                      </span>
                      {stats.feedingMl > 0 || stats.breastMin > 0 ? (
                        <span className="flex items-center gap-[2px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icon-stat-feeding.svg" alt="" width={16} height={16} aria-hidden="true" />
                          <span className="text-[10px] font-medium text-gray-900">
                            {stats.feedingMl > 0 ? `${stats.feedingMl}ml` : ''}
                            {stats.formulaMl > 0 || stats.pumpedMl > 0 ? (
                              <>
                                (
                                {stats.formulaMl > 0 ? (
                                  <span style={{ color: CATEGORY_STYLE.FORMULA.border }}>{stats.formulaMl}</span>
                                ) : null}
                                {stats.formulaMl > 0 && stats.pumpedMl > 0 ? '+' : ''}
                                {stats.pumpedMl > 0 ? (
                                  <span style={{ color: CATEGORY_STYLE.PUMPED_FEEDING.border }}>{stats.pumpedMl}</span>
                                ) : null}
                                )
                              </>
                            ) : null}
                            {stats.breastMin > 0 ? (
                              <>
                                {stats.feedingMl > 0 ? '+' : ''}
                                <span style={{ color: CATEGORY_STYLE.BREASTFEEDING.border }}>{stats.breastMin}분</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* 기록 행 */}
                  <div>
                    {group.records.map((r, idx) => {
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
                        <SwipeableRow
                          key={r.id}
                          rowId={r.id}
                          open={swipedRowId === r.id}
                          onOpenChange={(o) => setSwipedRowId(o ? r.id : null)}
                          onDelete={() => {
                            setDeleteTarget(r);
                          }}
                          isLast={idx === group.records.length - 1}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setSheetType(r.type);
                            }}
                            className="w-full text-left flex items-start px-4 py-3 active:bg-gray-50"
                          >
                            <span className="flex flex-col items-center shrink-0 mt-0.5">
                              <span
                                className="inline-flex items-center justify-center px-1.5 rounded-[4px] text-[10px] font-semibold tabular-nums"
                                style={{
                                  height: 16,
                                  backgroundColor: catStyle.bg,
                                  color: catStyle.border,
                                }}
                              >
                                {formatTime24(r.startAt)}
                              </span>
                              {r.endAt &&
                                new Date(r.endAt).getTime() !==
                                  new Date(r.startAt).getTime() && (
                                  <span className="mt-[2px] text-[10px] font-normal text-gray-400 tabular-nums">
                                    ~ {formatTime24(r.endAt)}
                                  </span>
                                )}
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
                        </SwipeableRow>
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

      {sheetType && selectedChild && (
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
        <QuickTypeSettingsSheet
          current={quickTypes}
          onClose={() => setShowAddQuick(false)}
          onSave={(next) => {
            persistQuick(next);
            setShowAddQuick(false);
          }}
        />
      )}

      <DatePickerModal
        open={showDatePicker}
        value={sortedDays[0]?.date ?? todayString()}
        min={earliestDate ?? undefined}
        max={todayString()}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d: string) => reload(d)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-trash.svg" alt="" width={32} height={32} />
          </div>
        }
        title="기록 삭제하기"
        description={'기록을 삭제할까요?\n삭제하면 다시 되돌릴 수 없어요.'}
        confirmLabel="삭제하기"
        cancelLabel="취소"
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) deleteRecord(target.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
