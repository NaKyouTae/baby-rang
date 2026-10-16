'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, type PanInfo } from 'framer-motion';
import { useSelectedChild } from '@/hooks/useChildren';
import { useRefreshOnForeground } from '@/hooks/useRefreshOnForeground';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import { calcChildAge } from '@/lib/childAge';
import { groupTwins } from '@/lib/twins';
import ChildSwitcher from '../home/_components/ChildSwitcher';
import PixelTabBar, { TAB_BAR_HEIGHT } from '../home/_components/PixelTabBar';
import { BOX, NoChildBox, RECORD_EMOJI as FILTER_ICON } from '../growth-record/pixelUi';
import {
  MENU_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  RECORD_ICONS,
} from '../growth-record/types';


// 디자인(패턴 화면)의 기록 색 — 필터 칩 테두리와 차트 막대가 같은 색을 쓴다.
// 유축 초록, 이유식 파랑, 수면 보라.
const TYPE_CHART_COLOR: Record<GrowthType, string> = {
  FORMULA: '#FF5675',
  BREASTFEEDING: '#FF7C5A',
  PUMPED_FEEDING: '#FFC951',
  PUMPING: '#6CC68A',
  BABY_FOOD: '#6A92EA',
  SLEEP: '#B67CF0',
  BATH: '#58B1FA',
  MEDICATION: '#B67CF0',
  DIAPER: '#A8837F',
  TEMPERATURE: '#515C66',
  MILK: '#58B1FA',
  WATER: '#58B1FA',
  HOSPITAL: '#A8837F',
  SNACK: '#FFC951',
  PLAY: '#ACE070',
  TUMMY_TIME: '#ACE070',
  ETC: '#BBC0C5',
};

/** 패턴 필터 칩 — 디자인처럼 홈 기록 버튼과 같은 7종(분유·모유·유축수유·유축·이유식·수면·기저귀)만 둔다. */
const PATTERN_TYPES: GrowthType[] = MENU_TYPES.filter((t) => FILTER_ICON[t] != null);

/** #RRGGBB 를 흰 바탕 위 5% 색으로 — 켜진 칩 바탕. */
function tint5(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.05)`;
}

const STORAGE_KEY = 'growth-pattern:selectedTypes';
const VIEW_MODE_KEY = 'growth-pattern:viewMode';

// 차트 카드 좌우 스와이프로 날짜 이동 — 손가락을 뗐을 때의 판정 기준.
const SWIPE_MIN_DISTANCE = 12; // 이보다 작으면 탭/흔들림으로 보고 무시
const SWIPE_DISTANCE = 56; // 천천히 끌었을 때 전환되는 거리
const SWIPE_VELOCITY = 400; // 짧게 튕겼을 때 전환되는 속도(px/s)
const PAGE_SPRING = { type: 'spring', stiffness: 420, damping: 42 } as const;

// 이전/현재/다음 페이지를 나란히 두므로, 트랙의 자식 인덱스는 0=이전, 1=현재, 2=다음.
const PAGE_OFFSETS = [-1, 0, 1] as const;

// 마지막으로 본 일/주 탭
function readStoredViewMode(): 'day' | 'week' {
  if (typeof window === 'undefined') return 'day';
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (raw === 'day' || raw === 'week') return raw;
  } catch {}
  return 'day';
}

// 서버 렌더 단계에서는 useLayoutEffect 경고가 뜨므로 useEffect 로 대체한다.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
function fromDateStr(date: string): Date {
  return new Date(`${date}T00:00:00`);
}
function formatDayLabel(date: string): string {
  const d = fromDateStr(date);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function clipToDay(
  r: GrowthRecord,
  dateStr: string,
): { startMin: number; endMin: number } | null {
  const dayStart = fromDateStr(dateStr).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const start = new Date(r.startAt).getTime();
  const end = r.endAt ? new Date(r.endAt).getTime() : start + 10 * 60 * 1000;
  const s = Math.max(start, dayStart);
  const e = Math.min(end, dayEnd);
  if (e <= s) return null;
  return {
    startMin: (s - dayStart) / 60000,
    endMin: (e - dayStart) / 60000,
  };
}

/**
 * endAt 이 없거나 지속시간이 0(이하)인 기록에 시각화용 합성(endAt) 을 부여한다.
 * - 기본 지속시간: 10분 (endAt==startAt 인 0분 기록도 10분으로 간주)
 * - 같은 startAt 에 2개 있으면 각 5분, 3개 있으면 각 3분(N개면 각 ⌊10/N⌋분)으로 순차 분할
 * - 그룹의 합성 종료가 다음 그룹의 startAt 을 넘으면 다음 startAt 까지로 잘라낸다.
 */
function withSyntheticEnd(records: GrowthRecord[]): GrowthRecord[] {
  const withEnd: GrowthRecord[] = [];
  const withoutEnd: GrowthRecord[] = [];
  for (const r of records) {
    // endAt 이 있어도 startAt 보다 크지 않으면(0분 이하) 합성 처리 대상으로 본다.
    const hasRealDuration =
      r.endAt && new Date(r.endAt).getTime() > new Date(r.startAt).getTime();
    if (hasRealDuration) withEnd.push(r);
    else withoutEnd.push(r);
  }
  withoutEnd.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  type Group = { startMs: number; items: GrowthRecord[] };
  const groups: Group[] = [];
  for (const r of withoutEnd) {
    const ms = new Date(r.startAt).getTime();
    const last = groups[groups.length - 1];
    if (last && last.startMs === ms) last.items.push(r);
    else groups.push({ startMs: ms, items: [r] });
  }

  const result: GrowthRecord[] = [...withEnd];
  for (let i = 0; i < groups.length; i++) {
    const { startMs, items } = groups[i];
    const nextStartMs =
      i + 1 < groups.length ? groups[i + 1].startMs : Infinity;
    const n = items.length;
    const perMin = Math.max(1, Math.floor(10 / n));
    let groupEndMs = startMs + perMin * n * 60000;
    if (groupEndMs > nextStartMs) groupEndMs = nextStartMs;
    const eachMs = (groupEndMs - startMs) / n;
    for (let j = 0; j < n; j++) {
      const sMs = startMs + j * eachMs;
      const eMs = sMs + eachMs;
      result.push({
        ...items[j],
        startAt: new Date(sMs).toISOString(),
        endAt: new Date(eMs).toISOString(),
      });
    }
  }
  return result;
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180;
  const x1 = cx + rOuter * Math.cos(startRad);
  const y1 = cy + rOuter * Math.sin(startRad);
  const x2 = cx + rOuter * Math.cos(endRad);
  const y2 = cy + rOuter * Math.sin(endRad);
  const x3 = cx + rInner * Math.cos(endRad);
  const y3 = cy + rInner * Math.sin(endRad);
  const x4 = cx + rInner * Math.cos(startRad);
  const y4 = cy + rInner * Math.sin(startRad);
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

export default function GrowthPatternClient() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const { openLoginPrompt } = useLoginPrompt();
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);
  const x = useMotionValue(0);
  const todayStr = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [days, setDays] = useState<Record<string, GrowthRecord[]>>({});
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<GrowthType>>(
    () =>
      new Set<GrowthType>([
        'FORMULA',
        'BREASTFEEDING',
        'PUMPED_FEEDING',
        'PUMPING',
        'BABY_FOOD',
        'SLEEP',
        'BATH',
      ]),
  );
  const [typesLoaded, setTypesLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as GrowthType[];
        if (Array.isArray(arr)) {
          setSelectedTypes(
            new Set(arr.filter((t) => (MENU_TYPES as string[]).includes(t))),
          );
        }
      }
    } catch {}
    setTypesLoaded(true);
  }, []);

  useEffect(() => {
    if (!typesLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(selectedTypes)),
      );
    } catch {}
  }, [selectedTypes, typesLoaded]);

  // 마지막으로 선택한 일/주 탭 복원.
  // 이 페이지는 정적 프리렌더라 서버 HTML 이 항상 'day' 다. 초기 state 를 localStorage 로 채우면
  // hydration mismatch 가 나 복원이 불안정해지므로, 초기값은 'day' 로 두고 layout effect 로 되돌린다.
  // layout effect 는 hydration commit 직후·첫 페인트 전에 동기 실행되므로 탭이 깜박이지 않는다.
  useIsomorphicLayoutEffect(() => {
    setViewMode(readStoredViewMode());
    setViewModeLoaded(true);
  }, []);

  // 복원이 끝나기 전에는 저장하지 않는다 — 초기값 'day' 로 덮어쓰는 것을 막는다.
  useEffect(() => {
    if (!viewModeLoaded) return;
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {}
  }, [viewMode, viewModeLoaded]);

  // 최신 요청만 반영하기 위한 요청 식별자(빠른 날짜 전환 시 stale 응답 무시).
  const reqIdRef = useRef(0);
  const loadRecords = useCallback(async () => {
    if (!selectedChild) return;
    // 좌측(가장 오래된) 컬럼의 새벽 시간대에 자정을 넘긴 전날 기록이 표시되도록
    // 표시 범위(-6)보다 하루 더 앞당겨 페치한다. 추가된 하루는 컬럼으로 노출되지 않고
    // forward spill 을 통해 dates[0] 새벽 영역만 채운다.
    // 스와이프 페이징을 위해 앞뒤로 한 페이지(일=1일, 주=7일)씩 더 받아둔다 —
    // 손가락을 따라 들어오는 옆 페이지가 빈 화면이 되지 않도록.
    const step = viewMode === 'day' ? 1 : 7;
    const from = shiftDate(selectedDate, -7 - step);
    const to = shiftDate(selectedDate, step);
    const myId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/growth-records/range?childId=${selectedChild.id}&from=${from}&to=${to}`,
      );
      if (reqIdRef.current !== myId) return;
      if (!res.ok) {
        setDays({});
        setLoading(false);
        return;
      }
      const data = (await res.json()) as GrowthRecord[];
      if (reqIdRef.current !== myId) return;
      const map: Record<string, GrowthRecord[]> = {};
      for (const r of data) {
        const sMs = new Date(r.startAt).getTime();
        const eMs = r.endAt ? new Date(r.endAt).getTime() : sMs;
        const startKey = toDateStr(new Date(sMs));
        (map[startKey] ||= []).push(r);
        if (eMs > sMs) {
          const endKey = toDateStr(new Date(eMs));
          if (endKey !== startKey) {
            let cursor = sMs;
            for (let i = 0; i < 7; i++) {
              const cur = new Date(cursor);
              cur.setHours(24, 0, 0, 0);
              if (cur.getTime() >= eMs) break;
              const key = toDateStr(cur);
              if (key !== startKey) (map[key] ||= []).push(r);
              cursor = cur.getTime();
              if (key === endKey) break;
            }
          }
        }
      }
      setDays(map);
      setLoading(false);
    } catch {
      if (reqIdRef.current !== myId) return;
      setDays({});
      setLoading(false);
    }
  }, [selectedChild, selectedDate, viewMode]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // 앱 포그라운드 복귀 시 현재 범위의 기록을 다시 불러온다.
  useRefreshOnForeground(loadRecords, { enabled: !!selectedChild });

  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(selectedDate, -(6 - i))),
    [selectedDate],
  );

  // 차트에는 칩이 있는 종류만 그린다 — 칩이 없는 종류는 켜고 끌 수 없으니 감춘다.
  const visibleTypes = useMemo(
    () => new Set(PATTERN_TYPES.filter((t) => selectedTypes.has(t))),
    [selectedTypes],
  );

  const toggleType = (t: GrowthType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const canGoNext =
    viewMode === 'day'
      ? selectedDate < todayStr
      : shiftDate(selectedDate, 1) <= todayStr;

  // 페이지 폭은 카드 뷰포트에서 실측한다. 카드가 isLoaded 이후에야 붙으므로
  // ref 콜백으로 잡아야 마운트 시점을 놓치지 않는다.
  const [pageWidth, setPageWidth] = useState(0);
  const pageObserverRef = useRef<ResizeObserver | null>(null);
  const pagerRef = useCallback((el: HTMLDivElement | null) => {
    pageObserverRef.current?.disconnect();
    pageObserverRef.current = null;
    if (!el) return;
    setPageWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setPageWidth(el.clientWidth));
    ro.observe(el);
    pageObserverRef.current = ro;
  }, []);

  // 날짜/탭이 바뀌면 가운데 페이지가 곧 새 내용을 그리므로 트랙을 원위치로 돌린다.
  // layout effect 라 리렌더 커밋 직후·페인트 전에 실행돼 한 프레임도 어긋나지 않는다.
  useIsomorphicLayoutEffect(() => {
    x.set(0);
  }, [selectedDate, viewMode, x]);

  const handlePrev = () => {
    setSelectedDate(shiftDate(selectedDate, viewMode === 'day' ? -1 : -7));
  };
  const handleNext = () => {
    if (!canGoNext) return;
    const step = viewMode === 'day' ? 1 : 7;
    const next = shiftDate(selectedDate, step);
    setSelectedDate(next > todayStr ? todayStr : next);
  };

  // ── 좌우 스와이프 페이징 ──
  // 이전/현재/다음 지표를 나란히 깔아두고 트랙 전체를 끌어, 옆 페이지가 손가락을 따라
  // 실제로 밀려 들어오게 한다. 커밋 시엔 스프링으로 한 페이지만큼 마저 넘긴다.
  // dir: -1 = 다음(왼쪽으로 밀기), +1 = 이전(오른쪽으로 밀기)
  const goToPage = (dir: -1 | 1) => {
    if (dir === -1 && !canGoNext) {
      animate(x, 0, PAGE_SPRING);
      return;
    }
    // 폭 측정 전이면 애니메이션 없이 즉시 전환
    if (!pageWidth) {
      if (dir === -1) handleNext();
      else handlePrev();
      return;
    }
    animate(x, dir * pageWidth, {
      ...PAGE_SPRING,
      onComplete: () => {
        if (dir === -1) handleNext();
        else handlePrev();
      },
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const committed =
      Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
      (Math.abs(dx) >= SWIPE_DISTANCE || Math.abs(vx) >= SWIPE_VELOCITY);
    if (!committed) {
      // dragConstraints 안에서 놓으면 framer 가 되돌려주지 않으므로 직접 제자리로.
      animate(x, 0, PAGE_SPRING);
      return;
    }
    goToPage(dx < 0 ? -1 : 1);
  };

  if (!isLoaded) return null;

  const noChild = !selectedChild;

  const rangeLabel =
    viewMode === 'day'
      ? formatDayLabel(selectedDate)
      : `${formatDayLabel(dates[0])} - ${formatDayLabel(dates[6])}`;

  const groups = groupTwins(children);
  const current = selectedChild
    ? (groups.find((g) => g.some((c) => c.id === selectedChild.id)) ?? [selectedChild])
    : null;
  const toGroup = (g: typeof children) => ({
    key: g[0].id,
    kids: g.map((c) => ({ name: c.name, gender: c.gender })),
  });
  const age = selectedChild ? calcChildAge(selectedChild.birthDate) : null;

  return (
    <div
      className="overflow-hidden flex flex-col gap-[10px] bg-[#F7F8F9] px-[20px]"
      style={{
        // 레이아웃이 높이 없는 div 로 감싸서 h-full 이 풀리지 않는다. 앱 셸 높이를 직접 준다.
        height: 'var(--app-h, 100dvh)',
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 탭바가 가리지 않는다.
        paddingBottom: 'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 10px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />

      <header className={`${BOX} h-[48px] shrink-0 flex items-center justify-center px-[10px]`}>
        <h1 className="text-[#121212] text-[16px] leading-none font-normal">패턴</h1>
      </header>

      {/* 아이 카드 — 쌍둥이는 한 카드에 같이 */}
      <div className="shrink-0 flex">
        {current && age ? (
          <ChildSwitcher
            current={toGroup(current)}
            groups={groups.map(toGroup)}
            ageParts={[`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`]}
            onSelect={(key) => {
              const next = children.find((c) => c.id === key);
              if (next) selectChild(next);
            }}
          />
        ) : (
          <NoChildBox
            sub="아기를 추가하면 하루 리듬을 보여드려요"
            loginMessage="로그인하고 우리 아기의 하루 리듬을 확인하세요."
          />
        )}
      </div>

      {/* 일간 / 주간 */}
      <div className="shrink-0 flex gap-[10px]">
        {(
          [
            ['day', '일간 패턴'],
            ['week', '주간 패턴'],
          ] as const
        ).map(([mode, label]) => {
          const on = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={on}
              className="flex-1 min-w-0 p-[10px] rounded-[4px] border border-[#121212] text-[#121212] text-[16px] leading-[1.4] whitespace-nowrap active:translate-y-px"
              // #FFD200 10% 를 흰 바탕 위에 겹쳐 불투명하게 칠한다
              style={{
                background: on
                  ? 'linear-gradient(rgba(255,210,0,0.1), rgba(255,210,0,0.1)), #FDFDFE'
                  : '#FDFDFE',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 기록 종류 필터 — 오른쪽 화면 끝까지 가로로 넘긴다 */}
      {/* 칩 물결 테두리가 칩 밖으로 3px 남짓 나오는데 가로 스크롤 줄은 위아래·왼쪽을 잘라 버린다.
          줄 안쪽에 여유를 두고 같은 만큼 바깥 여백을 당겨 자리는 그대로 둔다. */}
      <div className="shrink-0 -mr-[20px] -my-[5px] -ml-[5px]">
        <div className="flex gap-[10px] overflow-x-auto scrollbar-hide pr-[20px] py-[5px] pl-[5px]">
          {PATTERN_TYPES.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const color = TYPE_CHART_COLOR[t];
            const active = selectedTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (noChild) {
                    openLoginPrompt('로그인하고 우리 아기의 하루 리듬을 확인하세요.');
                    return;
                  }
                  toggleType(t);
                }}
                aria-label={cfg.label}
                aria-pressed={active}
                className="size-[50px] shrink-0 flex items-center justify-center rounded-[4px] border active:translate-y-px"
                style={{
                  borderColor: active ? color : '#BBC0C5',
                  // 기록 색은 5% 투명이라 흰 바탕 위에 겹쳐 불투명하게 칠한다
                  background: active
                    ? `linear-gradient(${tint5(color)}, ${tint5(color)}), #FDFDFE`
                    : '#F7F8F9',
                }}
              >
                <span className={active ? '' : 'opacity-50 grayscale'}>
                  {FILTER_ICON[t] ?? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={RECORD_ICONS[t]} alt="" width={32} height={32} className="block" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 차트 상자 — 날짜 이동 줄은 고정, 그 아래 차트만 좌우로 넘긴다 */}
      <div className={`${BOX} flex-1 min-h-0 flex flex-col overflow-hidden`}>
        <div className="h-[42px] shrink-0 flex items-center justify-center gap-[10px] border-b border-[#121212]">
          <button
            type="button"
            onClick={() => goToPage(1)}
            aria-label="이전"
            className="size-[24px] shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
          </button>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="text-[#121212] text-[14px] leading-[1.4] whitespace-nowrap tabular-nums active:opacity-70"
            aria-label="날짜 선택"
          >
            {rangeLabel}
          </button>
          <button
            type="button"
            onClick={() => goToPage(-1)}
            aria-label="다음"
            className={`size-[24px] shrink-0 ${canGoNext ? '' : 'opacity-30 pointer-events-none'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/chevron-right.svg" alt="" width={24} height={24} className="block" />
          </button>
        </div>

        <div ref={pagerRef} className="relative flex-1 min-h-0 overflow-hidden">
          {/* 지표 페이저 — 이전/현재/다음을 나란히 두고 트랙을 끈다.
              drag="x" 가 touch-action 을 pan-y 로 잡아 세로 스크롤과 충돌하지 않고,
              dragDirectionLock 이 첫 움직임의 축을 고정해 세로로 긁을 땐 가로로 끌리지 않는다. */}
          <motion.div
            className="flex h-full"
            style={{ x, width: pageWidth * 3, marginLeft: -pageWidth }}
            drag={noChild || !pageWidth ? false : 'x'}
            dragDirectionLock
            dragConstraints={{ left: canGoNext ? -pageWidth : 0, right: pageWidth }}
            dragElastic={0.12}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
          >
            {PAGE_OFFSETS.map((offset) => (
              <div
                key={offset}
                className="h-full shrink-0"
                style={{ width: pageWidth }}
                aria-hidden={offset !== 0}
              >
                <PatternPage
                  viewMode={viewMode}
                  dateStr={shiftDate(selectedDate, offset * (viewMode === 'day' ? 1 : 7))}
                  days={days}
                  selectedTypes={visibleTypes}
                  birthDate={selectedChild?.birthDate ?? null}
                  todayStr={todayStr}
                  loading={offset === 0 && loading}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 탭바는 화면 아래에 떠 있다 — 그 자리만큼 비워 둔다 */}
      <div className="shrink-0" style={{ height: TAB_BAR_HEIGHT }} aria-hidden />
      <PixelTabBar active="pattern" />

      <WheelDatePickerModal
        open={datePickerOpen}
        value={selectedDate}
        max={todayStr}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(d) => setSelectedDate(d)}
      />
    </div>
  );
}

/** 아이가 없을 때 아이 카드 자리. 비로그인은 로그인 안내, 로그인 회원은 마이페이지(아이 등록)로 보낸다. */

// 스와이프 페이저의 한 페이지 — 주어진 날짜(일 탭) 또는 그 날짜로 끝나는 7일(주 탭)의 지표.
function PatternPage({
  viewMode,
  dateStr,
  days,
  selectedTypes,
  birthDate,
  todayStr,
  loading,
}: {
  viewMode: 'day' | 'week';
  dateStr: string;
  days: Record<string, GrowthRecord[]>;
  selectedTypes: Set<GrowthType>;
  birthDate: string | null;
  todayStr: string;
  loading: boolean;
}) {
  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(dateStr, -(6 - i))),
    [dateStr],
  );

  // 합성 endAt 적용은 selectedTypes 무관하게 전체 기록에 대해 수행한 뒤 필터
  const daySyntheticRecords = useMemo(
    () => withSyntheticEnd(days[dateStr] ?? []),
    [days, dateStr],
  );

  const dayRecords = useMemo(
    () => daySyntheticRecords.filter((r) => selectedTypes.has(r.type)),
    [daySyntheticRecords, selectedTypes],
  );

  const ageDays = birthDate
    ? calcChildAge(birthDate, fromDateStr(dateStr)).days
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-[10px] py-[10px] flex-1 min-h-0 overflow-y-auto flex">
        {viewMode === 'day' ? (
          <DonutChart
            records={dayRecords}
            dateStr={dateStr}
            ageDays={ageDays}
            loading={loading}
          />
        ) : (
          <WeekBarChart
            dates={dates}
            days={days}
            selectedTypes={selectedTypes}
            todayStr={todayStr}
          />
        )}
      </div>
    </div>
  );
}

function DonutChart({
  records,
  dateStr,
  ageDays,
  loading,
}: {
  records: GrowthRecord[];
  dateStr: string;
  ageDays: number;
  loading: boolean;
}) {
  // viewBox 는 도넛 + 외곽 레이블이 모두 들어가도록 설계.
  // 도넛 자체는 R_OUTER 까지, 레이블은 LABEL_R 위치에 그리며 좌우 라벨이 잘리지 않도록 viewBox 안쪽에 배치.
  const VIEW = 240;
  const CX = 120;
  const CY = 120;
  const R_OUTER = 105;
  // SVG 활동 arc 의 inner radius — HTML overlay (88x88) 로 가운데 영역을 마감하므로 작은 값으로 둔다.
  const R_INNER = 6;
  // 도넛 외곽선과 숫자 사이 시각 간격 8px (10px text 중앙선 = 외곽 + 8 + 5 = 외곽 + 13)
  const LABEL_R = R_OUTER + 13;

  const hourLabels = useMemo(() => {
    return [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => {
      const angle = (h / 24) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      return {
        h,
        x: CX + LABEL_R * Math.cos(rad),
        y: CY + LABEL_R * Math.sin(rad),
      };
    });
  }, [LABEL_R]);

  // 숫자(짝수 시) 사이의 작은 dash — 홀수 시(1,3,5,...,23) 12개
  const ticks = useMemo(() => {
    return [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map((h) => {
      const angle = (h / 24) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const r1 = LABEL_R - 5;
      const r2 = LABEL_R + 5;
      return {
        h,
        x1: CX + r1 * Math.cos(rad),
        y1: CY + r1 * Math.sin(rad),
        x2: CX + r2 * Math.cos(rad),
        y2: CY + r2 * Math.sin(rad),
      };
    });
  }, [LABEL_R]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-full max-h-full"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="일간 패턴 도넛 차트"
      >
        {/* 배경 ring */}
        <circle cx={CX} cy={CY} r={R_OUTER} fill="#F7F8F9" />
        {/* 활동 arc */}
        {!loading &&
          records.map((r) => {
            const span = clipToDay(r, dateStr);
            if (!span) return null;
            const startAngle = (span.startMin / 1440) * 360;
            let endAngle = (span.endMin / 1440) * 360;
            if (endAngle - startAngle < 1.5) endAngle = startAngle + 1.5;
            if (endAngle >= 360) endAngle = 359.99;
            return (
              <path
                key={r.id}
                d={arcPath(CX, CY, R_OUTER, R_INNER, startAngle, endAngle)}
                fill={TYPE_CHART_COLOR[r.type]}
              />
            );
          })}
        {/* 숫자 사이 dash — 홀수 시 위치 */}
        {ticks.map((t) => (
          <line
            key={t.h}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#DFE0E1"
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}
        {/* 시간 레이블 — 10px gray500 */}
        {hourLabels.map((l) => (
          <text
            key={l.h}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontWeight="400"
            fill="#808991"
          >
            {l.h}
          </text>
        ))}
      </svg>
      {/* 가운데 88x88 영역 — HTML overlay 로 고정 크기 보장 */}
      <div className="absolute w-[88px] h-[88px] rounded-full bg-[#FDFDFE] flex items-center justify-center pointer-events-none">
        <span className="text-[14px] leading-none font-normal text-[#121212] tabular-nums">
          D+{ageDays}
        </span>
      </div>
    </div>
  );
}

function WeekBarChart({
  dates,
  days,
  selectedTypes,
  todayStr,
}: {
  dates: string[];
  days: Record<string, GrowthRecord[]>;
  selectedTypes: Set<GrowthType>;
  todayStr: string;
}) {
  const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const hasToday = dates.includes(todayStr);
  const now = new Date();
  const nowMinPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* 차트 영역 — 7개 컬럼이 8px gap 으로 가용 폭을 균등 분할 */}
        <div className="flex-1 relative grid grid-cols-7 gap-[4px]">
          {/* 3시간마다 가로선 — gray200 1px 50%. 맨 위·맨 아래(0시·24시)는 그리지 않는다. */}
          {HOURS.slice(1, -1).map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-[#EEF0F1]/50 pointer-events-none z-[1]"
              style={{ top: `${(h / 24) * 100}%` }}
            />
          ))}
          {dates.map((date) => (
            <div
              key={date}
              className="bg-[#F7F8F9] relative"
            >
              {withSyntheticEnd(days[date] ?? [])
                .filter((r) => selectedTypes.has(r.type))
                .map((r) => {
                  const span = clipToDay(r, date);
                  if (!span) return null;
                  const top = (span.startMin / 1440) * 100;
                  const heightPct = Math.max(
                    0.4,
                    ((span.endMin - span.startMin) / 1440) * 100,
                  );
                  return (
                    <div
                      key={r.id}
                      className="absolute left-0 right-0"
                      style={{
                        top: `${top}%`,
                        height: `${heightPct}%`,
                        background: TYPE_CHART_COLOR[r.type],
                      }}
                      title={TYPE_CONFIG[r.type].label}
                    />
                  );
                })}
            </div>
          ))}
          {/* 현재 시각 점선 — 오늘 날짜가 범위에 포함될 때 */}
          {hasToday && (
            <div
              // 디자인: 1px, 2px 그리고 2px 비우는 점선, #FF4040.
              // border 클래스를 쓰면 물결 테두리가 덮어 버려서 배경 그라데이션으로 점선을 그린다.
              className="absolute left-0 right-0 h-px -translate-y-1/2 pointer-events-none z-[2]"
              style={{
                top: `${nowMinPct}%`,
                background: 'repeating-linear-gradient(to right, #FF4040 0 2px, transparent 2px 4px)',
              }}
            />
          )}
        </div>
        {/* Y축 시간 레이블 — 각 라벨의 세로 중앙이 해당 border line 과 정확히 일치 (translateY -50%) */}
        <div className="relative w-[20px] ml-[5px]">
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 text-center text-[10px] font-normal text-[#BBC0C5] leading-none"
              style={{
                top: `${(h / 24) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {pad(h)}
            </div>
          ))}
        </div>
      </div>
      {/* X축 날짜 레이블 — 차트와 10px 간격, 컬럼과 동일하게 grid 로 정렬 */}
      <div className="flex mt-[10px] shrink-0">
        <div className="flex-1 grid grid-cols-7 gap-[4px]">
          {dates.map((date) => {
            const d = fromDateStr(date);
            return (
              <div
                key={date}
                className="text-center text-[10px] leading-none font-normal text-[#BBC0C5]"
              >
                {d.getDate()}일
              </div>
            );
          })}
        </div>
        <div className="w-[20px] ml-[5px]" />
      </div>
    </div>
  );
}
