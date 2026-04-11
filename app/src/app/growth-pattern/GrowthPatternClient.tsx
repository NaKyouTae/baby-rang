'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import EmptyChildState from '@/components/EmptyChildState';
import ChildSelector from '@/components/ChildSelector';
import {
  ALL_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
} from '../growth-record/types';
import { toKstYmd } from '@/lib/childAge';

export interface GrowthPatternInitData {
  children: Array<{
    id: string;
    name: string;
    gender: string;
    birthDate: string;
    profileImage?: string | null;
  }>;
  earliestDate: string | null;
  records: GrowthRecord[];
  from: string;
  to: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// 주의 시작(월요일) 날짜 반환
function startOfWeek(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay(); // 0=일
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// 하루 분 → top%
function minToPct(min: number): number {
  return (min / (24 * 60)) * 100;
}

function recordSpans(
  r: GrowthRecord,
  dateStr: string,
): { top: number; height: number } | null {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const start = new Date(r.startAt).getTime();
  const end = r.endAt ? new Date(r.endAt).getTime() : start + 60 * 1000;
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  if (e <= s) return null;
  const sMin = (s - dayStart) / 60000;
  const eMin = (e - dayStart) / 60000;
  const top = minToPct(sMin);
  const height = Math.max(0.4, minToPct(eMin - sMin));
  return { top, height };
}

// 컬러 매핑(차트용)
const TYPE_CHART_COLOR: Record<GrowthType, string> = {
  FORMULA: '#fbbf24',
  BREASTFEEDING: '#f9a8d4',
  PUMPED_FEEDING: '#fb7185',
  PUMPING: '#38bdf8',
  SLEEP: '#818cf8',
  BATH: '#22d3ee',
  MEDICATION: '#a78bfa',
  DIAPER: '#fcd34d',
  BABY_FOOD: '#fb923c',
  MILK: '#60a5fa',
  WATER: '#7dd3fc',
  HOSPITAL: '#ef4444',
  TEMPERATURE: '#f87171',
  SNACK: '#f59e0b',
  PLAY: '#4ade80',
  TUMMY_TIME: '#a3e635',
  ETC: '#9ca3af',
};

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function buildInitialDaysMap(records: GrowthRecord[]): Record<string, GrowthRecord[]> {
  const map: Record<string, GrowthRecord[]> = {};
  const DAY_MS = 24 * 60 * 60 * 1000;
  const toKstKey = (ms: number) => {
    const kst = new Date(ms + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
  };
  for (const r of records) {
    const startMs = new Date(r.startAt).getTime();
    const endMs = r.endAt ? new Date(r.endAt).getTime() : startMs;
    const startKey = toKstKey(startMs);
    (map[startKey] ||= []).push(r);
    if (endMs > startMs) {
      const endKey = toKstKey(endMs);
      if (endKey !== startKey) {
        let cursor = startMs;
        for (let i = 0; i < 7; i++) {
          const kst = new Date(cursor + 9 * 60 * 60 * 1000);
          kst.setUTCHours(0, 0, 0, 0);
          const nextKstMidnightMs = kst.getTime() + DAY_MS - 9 * 60 * 60 * 1000;
          if (nextKstMidnightMs >= endMs) break;
          const key = toKstKey(nextKstMidnightMs);
          if (key !== startKey && (map[key]?.[map[key].length - 1] !== r)) {
            (map[key] ||= []).push(r);
          }
          cursor = nextKstMidnightMs;
          if (key === endKey) break;
        }
      }
    }
  }
  return map;
}

export default function GrowthPatternClient({
  initialData,
}: {
  initialData?: GrowthPatternInitData | null;
}) {
  const { children, isLoaded } = useChildren();
  const hasInit = !!initialData;

  const initChildren: Child[] = hasInit
    ? initialData.children.map((c) => ({
        ...c,
        birthDate: toKstYmd(c.birthDate),
      }))
    : [];

  // 윈도우 로딩 설정
  const INITIAL_WEEKS = 4; // 현재 주 + 이전 3주
  const CHUNK_WEEKS = 4; // 추가 로드 단위
  const PREFETCH_LEFT = 1; // 좌측 N주 남으면 prefetch
  const todayStr = toDateStr(new Date());
  const currentWeekStart = startOfWeek(todayStr);

  const [selectedChild, setSelectedChild] = useState<Child | null>(
    initChildren.length > 0 ? initChildren[0] : null,
  );
  // 표시 중인 주 시작일 배열 (오름차순: 과거 → 현재). 좌측으로 prepend
  const [weekStarts, setWeekStarts] = useState<string[]>(() =>
    Array.from({ length: INITIAL_WEEKS }, (_, i) =>
      shiftDate(currentWeekStart, (i - (INITIAL_WEEKS - 1)) * 7),
    ),
  );
  // 활성 주를 인덱스가 아닌 주 시작일로 추적 (prepend되어도 안정)
  const [activeWeekStart, setActiveWeekStart] = useState<string>(currentWeekStart);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<GrowthType>>(
    () => new Set<GrowthType>(['SLEEP', 'FORMULA', 'DIAPER']),
  );
  const [typesLoaded, setTypesLoaded] = useState(false);
  const [days, setDays] = useState<Record<string, GrowthRecord[]>>(
    hasInit ? buildInitialDaysMap(initialData.records ?? []) : {},
  );
  const [loading, setLoading] = useState(false);
  const [earliestDate, setEarliestDate] = useState<string | null>(
    hasInit ? initialData.earliestDate : null,
  );
  const loadingOlderRef = useRef(false);
  const didInitScrollRef = useRef(false);
  const chartWrapRef = useRef<HTMLElement | null>(null);
  const [chartHeight, setChartHeight] = useState(360);
  const initUsedRef = useRef(hasInit);

  // 차트 높이를 디바이스 뷰포트에 맞춰 계산 (하단 네비 + 여백 제외)
  useEffect(() => {
    const BOTTOM_NAV_OFFSET = 112; // 하단 네비 높이 + safe-area + 여유 여백
    const CHART_CHROME = 56; // 카드 패딩 + 하단 날짜 라벨
    const recompute = () => {
      const el = chartWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const avail = window.innerHeight - top - BOTTOM_NAV_OFFSET - CHART_CHROME;
      setChartHeight(Math.max(240, Math.floor(avail)));
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, [selectedTypes, loading]);

  useEffect(() => {
    if (isLoaded && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [isLoaded, children, selectedChild]);

  // SSR prefetch 후 useChildren 캐시가 로드되면 children 동기화
  useEffect(() => {
    if (hasInit && isLoaded && children.length > 0 && selectedChild) {
      const updated = children.find((c) => c.id === selectedChild.id);
      if (updated && updated !== selectedChild) setSelectedChild(updated);
    }
  }, [isLoaded, children, hasInit, selectedChild]);

  // localStorage에서 선택 항목 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem('growth-pattern:selectedTypes');
      if (raw) {
        const arr = JSON.parse(raw) as GrowthType[];
        if (Array.isArray(arr)) {
          setSelectedTypes(
            new Set(arr.filter((t) => (ALL_TYPES as string[]).includes(t))),
          );
        }
      }
    } catch {}
    setTypesLoaded(true);
  }, []);

  // 선택 항목 저장
  useEffect(() => {
    if (!typesLoaded) return;
    try {
      localStorage.setItem(
        'growth-pattern:selectedTypes',
        JSON.stringify(Array.from(selectedTypes)),
      );
    } catch {}
  }, [selectedTypes, typesLoaded]);

  const weeks = useMemo(
    () =>
      weekStarts.map((start) =>
        Array.from({ length: 7 }, (_, i) => shiftDate(start, i)),
      ),
    [weekStarts],
  );
  // 범위 조회: from~to(주차 시작일 6일 후)까지 한 번에 가져와 날짜별 그룹핑
  const fetchRange = useCallback(
    async (
      childId: string,
      from: string,
      to: string,
    ): Promise<Record<string, GrowthRecord[]>> => {
      const res = await fetch(
        `/api/growth-records/range?childId=${childId}&from=${from}&to=${to}`,
      );
      if (!res.ok) return {};
      const data = (await res.json()) as GrowthRecord[];
      const map: Record<string, GrowthRecord[]> = {};
      const toKstKey = (ms: number) => {
        const kst = new Date(ms + 9 * 60 * 60 * 1000);
        return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
      };
      const DAY_MS = 24 * 60 * 60 * 1000;
      for (const r of data) {
        const startMs = new Date(r.startAt).getTime();
        const endMs = r.endAt ? new Date(r.endAt).getTime() : startMs;
        // 자정을 넘기는 기록은 걸쳐있는 모든 KST 날짜 버킷에 push
        const startKey = toKstKey(startMs);
        (map[startKey] ||= []).push(r);
        if (endMs > startMs) {
          const endKey = toKstKey(endMs);
          if (endKey !== startKey) {
            // KST 자정 기준으로 한 칸씩 전진하며 키 추가 (안전 상한: 7일)
            let cursor = startMs;
            for (let i = 0; i < 7; i++) {
              const kst = new Date(cursor + 9 * 60 * 60 * 1000);
              kst.setUTCHours(0, 0, 0, 0);
              const nextKstMidnightMs = kst.getTime() + DAY_MS - 9 * 60 * 60 * 1000;
              if (nextKstMidnightMs >= endMs) break;
              const key = toKstKey(nextKstMidnightMs);
              if (key !== startKey && (map[key]?.[map[key].length - 1] !== r)) {
                (map[key] ||= []).push(r);
              }
              cursor = nextKstMidnightMs;
              if (key === endKey) break;
            }
          }
        }
      }
      return map;
    },
    [],
  );

  // 자식 선택 변경 시 초기화 + 초기 N주 로드 — BFF로 한 번에 가져오기
  useEffect(() => {
    if (!selectedChild) return;
    // SSR prefetch 데이터를 이미 사용한 첫 렌더에서는 스킵
    if (initUsedRef.current) {
      initUsedRef.current = false;
      return;
    }
    let cancelled = false;
    const initial = Array.from({ length: INITIAL_WEEKS }, (_, i) =>
      shiftDate(currentWeekStart, (i - (INITIAL_WEEKS - 1)) * 7),
    );
    setWeekStarts(initial);
    setActiveWeekStart(currentWeekStart);
    setDays({});
    setLoading(true);
    didInitScrollRef.current = false;
    loadingOlderRef.current = false;

    const from = initial[0];
    const to = shiftDate(initial[initial.length - 1], 6);

    (async () => {
      let map: Record<string, GrowthRecord[]> = {};
      let earliest: string | null = null;

      try {
        // BFF: earliest + range 를 Vercel Function 1개에서 병렬 처리
        const res = await fetch(
          `/api/growth-records/pattern-init?childId=${selectedChild.id}&from=${from}&to=${to}`,
        );
        if (res.ok) {
          const data = await res.json();
          earliest = data.earliestDate ?? null;
          // range 응답을 날짜별로 그룹핑 (fetchRange와 동일 로직)
          const records: GrowthRecord[] = data.records ?? [];
          const DAY_MS = 24 * 60 * 60 * 1000;
          const toKstKey = (ms: number) => {
            const kst = new Date(ms + 9 * 60 * 60 * 1000);
            return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
          };
          for (const r of records) {
            const startMs = new Date(r.startAt).getTime();
            const endMs = r.endAt ? new Date(r.endAt).getTime() : startMs;
            const startKey = toKstKey(startMs);
            (map[startKey] ||= []).push(r);
            if (endMs > startMs) {
              const endKey = toKstKey(endMs);
              if (endKey !== startKey) {
                let cursor = startMs;
                for (let i = 0; i < 7; i++) {
                  const kst = new Date(cursor + 9 * 60 * 60 * 1000);
                  kst.setUTCHours(0, 0, 0, 0);
                  const nextKstMidnightMs = kst.getTime() + DAY_MS - 9 * 60 * 60 * 1000;
                  if (nextKstMidnightMs >= endMs) break;
                  const key = toKstKey(nextKstMidnightMs);
                  if (key !== startKey && (map[key]?.[map[key].length - 1] !== r)) {
                    (map[key] ||= []).push(r);
                  }
                  cursor = nextKstMidnightMs;
                  if (key === endKey) break;
                }
              }
            }
          }
        }
      } catch {
        // fallback: 개별 호출
        const [rangeMap, e] = await Promise.all([
          fetchRange(selectedChild.id, from, to),
          fetch(`/api/growth-records/earliest?childId=${selectedChild.id}`)
            .then((r) => (r.ok ? r.json() : { date: null }))
            .then((j) => (j?.date as string | null) ?? null)
            .catch(() => null),
        ]);
        map = rangeMap;
        earliest = e;
      }

      if (cancelled) return;
      setDays(map);
      setEarliestDate(earliest);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChild, currentWeekStart, fetchRange]);

  // 좌측으로 추가 4주 prepend 로드
  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current) return;
    if (!selectedChild) return;
    const oldest = weekStarts[0];
    if (!oldest) return;
    if (earliestDate && oldest <= earliestDate) return;

    loadingOlderRef.current = true;
    const newOldest = shiftDate(oldest, -CHUNK_WEEKS * 7);
    const newWeeks = Array.from({ length: CHUNK_WEEKS }, (_, i) =>
      shiftDate(newOldest, i * 7),
    );
    const from = newWeeks[0];
    const to = shiftDate(newWeeks[newWeeks.length - 1], 6);

    // prepend 후 scrollLeft 보정 위해 현재 콘텐츠 폭 측정
    const el = scrollerRef.current;
    const prevScrollWidth = el?.scrollWidth ?? 0;
    const prevScrollLeft = el?.scrollLeft ?? 0;

    try {
      const map = await fetchRange(selectedChild.id, from, to);
      setDays((prev) => ({ ...prev, ...map }));
      setWeekStarts((prev) => [...newWeeks, ...prev]);

      // DOM 업데이트 후 scroll 위치 보정 (점프 방지)
      requestAnimationFrame(() => {
        const el2 = scrollerRef.current;
        if (!el2) return;
        const delta = el2.scrollWidth - prevScrollWidth;
        const prevBehavior = el2.style.scrollBehavior;
        el2.style.scrollBehavior = 'auto';
        el2.scrollLeft = prevScrollLeft + delta;
        el2.style.scrollBehavior = prevBehavior;
      });
    } finally {
      loadingOlderRef.current = false;
    }
  }, [selectedChild, weekStarts, earliestDate, fetchRange]);

  const toggleType = (t: GrowthType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const rangeLabel = useMemo(() => {
    if (!activeWeekStart) return '';
    const sd = new Date(`${activeWeekStart}T00:00:00`);
    const ed = new Date(`${shiftDate(activeWeekStart, 6)}T00:00:00`);
    return `${sd.getMonth() + 1}월 ${sd.getDate()}일 - ${ed.getDate()}일`;
  }, [activeWeekStart]);

  // scroller가 DOM에 붙는 즉시(레이아웃 직후) 현재 주(가장 우측)로 점프 — 애니메이션 없이 1회
  const setScrollerRef = useCallback((el: HTMLDivElement | null) => {
    scrollerRef.current = el;
    if (!el || didInitScrollRef.current) return;
    const lastIdx = el.children.length - 1;
    const item = el.children[lastIdx] as HTMLElement | undefined;
    if (!item) return;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft =
      item.offsetLeft - (el.clientWidth - item.clientWidth) / 2;
    el.style.scrollBehavior = prev;
    didInitScrollRef.current = true;
  }, []);

  // 스크롤 시 활성 주 갱신 + 좌측 임계점 도달 시 prefetch
  const onWeeksScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const mid = c.offsetLeft + c.clientWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    const nextStart = weekStarts[bestIdx];
    if (nextStart && nextStart !== activeWeekStart) {
      setActiveWeekStart(nextStart);
    }
    // 좌측 PREFETCH_LEFT주 이내 도달 시 추가 로드
    if (bestIdx <= PREFETCH_LEFT) {
      loadOlder();
    }
  };

  // SSR prefetch가 있으면 useChildren 로딩 기다리지 않고 바로 렌더
  if (!hasInit && !isLoaded) return null;

  if ((hasInit ? initChildren : children).length === 0) {
    return (
      <EmptyChildState
        emoji="📊"
        title="패턴"
        description={
          <>
            아이를 등록하면<br />
            하루 리듬을 한눈에 볼 수 있어요.
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] overflow-hidden">
      <header className="px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-3">
        <ChildSelector
          children={isLoaded ? children : initChildren}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </header>

      {/* 타입 필터 */}
      <div className="mt-4 px-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {ALL_TYPES.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const active = selectedTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base border transition-all ${
                  active
                    ? `${cfg.color} border-transparent shadow-sm`
                    : 'bg-gray-100 text-gray-300 border-gray-100 grayscale opacity-60'
                }`}
                aria-label={cfg.label}
              >
                {cfg.emoji}
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          {ALL_TYPES.length}개 중 {selectedTypes.size}개 선택됨
        </p>
      </div>

      {/* 날짜 라벨 */}
      <div className="mt-3 px-5 flex items-center justify-center">
        <p className="text-base font-bold text-indigo-500">📅 {rangeLabel}</p>
      </div>

      {/* 차트 - 가로 스크롤로 주 이동 */}
      <main ref={chartWrapRef as React.RefObject<HTMLElement>} className="flex-1 mt-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div
            ref={setScrollerRef}
            onScroll={onWeeksScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth pb-6 px-8"
          >
            {weeks.map((dates) => (
              <div
                key={dates[0]}
                className="snap-center [scroll-snap-stop:always] shrink-0 w-full px-1.5"
                aria-current={dates[0] === activeWeekStart ? 'true' : undefined}
              >
                <PatternChart
                  dates={dates}
                  days={days}
                  selectedTypes={selectedTypes}
                  height={chartHeight}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PatternChart({
  dates,
  days,
  selectedTypes,
  height,
}: {
  dates: string[];
  days: Record<string, GrowthRecord[]>;
  selectedTypes: Set<GrowthType>;
  height: number;
}) {
  const today = toDateStr(new Date());
  // 점 표시(시작/끝 없는 이벤트, 예: 기저귀)는 따로 그림
  return (
    <div className="bg-white rounded-2xl shadow-sm pt-3 pb-4 pl-1 pr-1">
      <div className="flex">
        {/* 좌측 시간 축 */}
        <HourAxis height={height} />
        {/* 컬럼들 */}
        <div className="flex-1 relative flex" style={{ height }}>
          {dates.map((date) => {
            const records = (days[date] ?? []).filter((r) =>
              selectedTypes.has(r.type),
            );
            return (
              <DayColumn key={date} date={date} records={records} height={height} />
            );
          })}
          {dates.includes(today) && (
            <div
              className="pointer-events-none absolute left-0 right-0 border-t-2 border-red-500 z-10"
              style={{
                top: `${minToPct(new Date().getHours() * 60 + new Date().getMinutes())}%`,
              }}
            />
          )}
        </div>
        {/* 우측 시간 축 */}
        <HourAxis height={height} />
      </div>
      {/* 하단 날짜 라벨 */}
      <div className="flex mt-2">
        <div className="w-7" />
        <div className="flex-1 flex">
          {dates.map((date) => {
            const d = new Date(`${date}T00:00:00`);
            const isSun = d.getDay() === 0;
            const isSat = d.getDay() === 6;
            return (
              <div
                key={date}
                className={`flex-1 text-center text-[11px] font-semibold ${
                  isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {`${d.getDate()}일`}
              </div>
            );
          })}
        </div>
        <div className="w-7" />
      </div>
    </div>
  );
}

function HourAxis({ height }: { height: number }) {
  return (
    <div className="w-7 relative" style={{ height }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 text-[10px] text-gray-300 text-center -translate-y-1/2"
          style={{ top: `${minToPct(h * 60)}%` }}
        >
          {pad(h)}
        </div>
      ))}
      <div
        className="absolute left-0 right-0 text-[10px] text-gray-300 text-center -translate-y-full"
        style={{ top: '100%' }}
      >
        23:40
      </div>
    </div>
  );
}

function DayColumn({
  date,
  records,
  height,
}: {
  date: string;
  records: GrowthRecord[];
  height: number;
}) {
  // 막대형(시간 범위 있는 기록) vs 점형(시점 기록) 구분
  // 시점만 있는 기록은 작은 아이콘 점으로 표시
  return (
    <div className="flex-1 px-[2px]">
      <div
        className="relative bg-gray-50 rounded-md overflow-visible"
        style={{ height }}
      >
        {/* 시간 가이드라인 */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-white"
            style={{ top: `${minToPct(h * 60)}%` }}
          />
        ))}
        {records.map((r) => {
          const cfg = TYPE_CONFIG[r.type];
          const span = recordSpans(r, date);
          if (!span) return null;
          const color = TYPE_CHART_COLOR[r.type];
          if (cfg.hasEnd && r.endAt) {
            return (
              <div
                key={r.id}
                className="absolute left-0 right-0 opacity-90"
                style={{
                  top: `${span.top}%`,
                  height: `${span.height}%`,
                  background: color,
                }}
                title={cfg.label}
              />
            );
          }
          // 점형
          return (
            <div
              key={r.id}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-full text-[15px] leading-none pointer-events-none"
              style={{ top: `${span.top}%` }}
              title={cfg.label}
            >
              {cfg.emoji}
            </div>
          );
        })}
      </div>
    </div>
  );
}
