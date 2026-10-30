'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelectedChild } from '@/hooks/useChildren';
import { fetchAndCache, peekCached } from '@/hooks/appCache';
import { recordPageInitUrl } from '@/lib/tabData';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import {
  MENU_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  RECORD_ICONS,
  CATEGORY_STYLE,
  summarizeRecord,
  recordTitle,
} from './types';
import EntrySheet from './EntrySheet';
import QuickTypeSettingsSheet from './QuickTypeSettingsSheet';
import {
  getCachedQuickTypes,
  setCachedQuickTypes,
  getCachedDays,
  setCachedDays,
  buildDefaultRecordData,
} from './recordDefaults';
import { reloadWidget } from '@/lib/widgetBridge';
import RecordDatePopup from './RecordDatePopup';
import ConfirmModal from '../home/_components/ConfirmModal';
import Loading from '@/components/Loading';
import PixelTabBar, { TAB_BAR_HEIGHT } from '../home/_components/PixelTabBar';
import { useLockAppScroll } from '@/hooks/useLockAppScroll';
import ChildSwitcher from '../home/_components/ChildSwitcher';
import { calcChildAge } from '@/lib/childAge';
import { groupTwins } from '@/lib/twins';
import { BOX, NoChildBox, PIXEL_FONT, PIXEL_FONT_HREF, RECORD_EMOJI } from './pixelUi';

// 삭제 버튼은 기록 행 높이만큼 정사각형(Figma 66px)
const SWIPE_DELETE_WIDTH = 66;
const SWIPE_OPEN_THRESHOLD = 30;


function SwipeableRow({
  open,
  onOpenChange,
  onDelete,
  children,
  rowId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
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
      // 가로만 자른다(스와이프로 밀린 내용·삭제 버튼). 세로까지 자르면 행 아래로 3px 걸쳐 그리는
      // 손그림 구분선이 반쯤 잘려 지지직거린다. 선은 다음 행 배경에 덮이지 않게 z 를 올린다.
      className="relative overflow-x-clip [&::after]:z-[1] bg-[#FDFDFE] border-b border-[#121212]"
    >
      {/* 삭제 버튼은 열림/드래그 중일 때만 렌더 — 닫힘 상태에서 앞쪽 컨텐츠의
          translateX 레이어 경계로 빨간 라인이 비치는 현상 방지 */}
      {(open || dragging) && (
        <button
          type="button"
          data-swipe-delete
          onClick={onDelete}
          aria-label="삭제"
          tabIndex={open ? 0 : -1}
          style={{ width: SWIPE_DELETE_WIDTH }}
          className="absolute top-0 right-0 bottom-0 bg-[#FF4040] border-l border-[#121212] active:opacity-80 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/trash.svg" alt="" width={24} height={24} aria-hidden="true" />
        </button>
      )}
      <div
        className={`relative bg-[#FDFDFE] select-none ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
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

/** 앱 공통 로딩 아이콘(components/Loading)을 이 화면 색으로 */
function Spinner({ size = 24 }: { size?: number }) {
  return <Loading size={size} className="text-[#808991]" />;
}

/** 기록 리스트가 도착하기 전 표시 — 하단 더보기 로딩과 동일한 형태 */
function ListLoading() {
  return (
    <div className="py-16 flex items-center justify-center" aria-live="polite">
      <Spinner size={22} />
    </div>
  );
}

const DEFAULT_QUICK_TYPES: GrowthType[] = [...MENU_TYPES];

function normalizeQuickTypes(types: GrowthType[] | undefined): GrowthType[] {
  const allowed = (types ?? []).filter((type) => MENU_TYPES.includes(type));
  const legacyDefault = ['FORMULA', 'SLEEP', 'DIAPER', 'BABY_FOOD'];
  if (!allowed.length || (allowed.length === legacyDefault.length &&
    allowed.every((type, i) => type === legacyDefault[i]))) return [...DEFAULT_QUICK_TYPES];
  return allowed;
}

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
  // 수유 기록 존재 여부 판별용 카운트(양이 0이어도 표시하기 위함)
  let feedingCount = 0; // 젖병/모유 전체
  let bottleCount = 0; // 분유/유축/우유 등 ml 기록
  // 이유식은 단위가 ml/g 로 갈리므로 단위별로 따로 합산한다.
  let babyFoodMl = 0;
  let babyFoodG = 0;
  let babyFoodCount = 0;
  let babyFoodUnit: BabyFoodUnit | null = null; // 그날 처음 쓰인 단위 — 양이 없을 때 "0<단위>" 표기에 사용
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
      feedingCount += 1;
      bottleCount += 1;
      const ml = Number((r.data as Record<string, unknown>)?.amountMl);
      if (!Number.isNaN(ml)) {
        if (r.type === 'FORMULA') formulaMl += ml;
        else if (r.type === 'PUMPED_FEEDING') pumpedMl += ml;
        else otherFeedingMl += ml;
      }
    }
    if (r.type === 'BREASTFEEDING') {
      feedingCount += 1;
      const data = (r.data ?? {}) as Record<string, unknown>;
      const left = Number(data.leftMin) || 0;
      const leftS = Number(data.leftSec) || 0;
      const right = Number(data.rightMin) || 0;
      const rightS = Number(data.rightSec) || 0;
      breastMin += left + right + Math.round((leftS + rightS) / 60);
    }
    if (r.type === 'BABY_FOOD') {
      babyFoodCount += 1;
      // 신규(amount + amountUnit) 우선, 없으면 레거시 amountG / amountMl 폴백.
      // summarizeRecord 의 우선순위와 동일하게 맞춘다.
      const data = (r.data ?? {}) as Record<string, unknown>;
      const unit = data.amountUnit === 'g' || data.amountUnit === 'ml' ? data.amountUnit : null;
      const amount = Number(data.amount);
      if (unit && Number.isFinite(amount)) {
        if (unit === 'g') babyFoodG += amount;
        else babyFoodMl += amount;
        babyFoodUnit ??= unit;
      } else if (Number.isFinite(Number(data.amountG))) {
        babyFoodG += Number(data.amountG);
        babyFoodUnit ??= 'g';
      } else if (Number.isFinite(Number(data.amountMl))) {
        babyFoodMl += Number(data.amountMl);
        babyFoodUnit ??= 'ml';
      }
    }
  }
  const feedingMl = formulaMl + pumpedMl + otherFeedingMl;
  return {
    napMin,
    nightMin,
    feedingMl,
    formulaMl,
    pumpedMl,
    breastMin,
    feedingCount,
    bottleCount,
    babyFoodMl,
    babyFoodG,
    babyFoodCount,
    babyFoodUnit,
  };
}

type BabyFoodUnit = 'ml' | 'g';

// 상단 상세에서는 이유식 양을 단위 없는 하나의 값으로 표시한다.
function formatBabyFoodAmount(stats: { babyFoodMl: number; babyFoodG: number }): string {
  return String(stats.babyFoodMl + stats.babyFoodG);
}

type DayStats = ReturnType<typeof computeDayStats>;

// 하루 수유 합계 — "모유 10분 + 총 890ml(분유 210 + 이유식 180)" 처럼 카테고리 색으로 나눠 보여준다.
// 기록이 없으면 0ml.
function FeedingStat({ stats }: { stats: DayStats }) {
  const breakdown: ReactNode[] = [];
  const pushBreakdown = (key: string, color: string, text: string) => {
    if (breakdown.length > 0) breakdown.push(<span key={`${key}-sep`}>+</span>);
    breakdown.push(
      <span key={key} style={{ color }}>
        {text}
      </span>,
    );
  };
  if (stats.formulaMl > 0) {
    pushBreakdown('formula', CATEGORY_STYLE.FORMULA.border, String(stats.formulaMl));
  }
  if (stats.pumpedMl > 0) {
    pushBreakdown('pumped', CATEGORY_STYLE.PUMPED_FEEDING.border, String(stats.pumpedMl));
  }
  // 괄호 안 이유식 값은 숫자만 표시한다.
  if (stats.babyFoodCount > 0) {
    pushBreakdown('babyFood', CATEGORY_STYLE.BABY_FOOD.border, formatBabyFoodAmount(stats));
  }
  // 상단 집계는 이유식의 입력 숫자까지 합산해 섭취 총량 하나를 ml로 표시한다.
  const totalMl = stats.feedingMl + stats.babyFoodMl + stats.babyFoodG;
  const feedingTotal = stats.bottleCount > 0 || stats.babyFoodCount > 0 ? `${totalMl}ml` : '';
  const hasBreast = stats.breastMin > 0;
  return (
    <>
      {hasBreast ? (
        <span style={{ color: CATEGORY_STYLE.BREASTFEEDING.border }}>{stats.breastMin}분</span>
      ) : null}
      {feedingTotal ? (
        <>
          {hasBreast ? '+' : ''}
          {feedingTotal}
          {breakdown.length > 0 ? <>({breakdown})</> : null}
        </>
      ) : null}
      {!hasBreast && !feedingTotal ? '0ml' : null}
    </>
  );
}

/** 날짜 머리 — 가운데 "< 10월 7일(수) >", 오른쪽 위 D+N(오늘이면 '오늘'), 아래 줄에 하루 합계. */
function DayHeader({
  date,
  stats,
  rightLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPickDate,
}: {
  date: string;
  stats: DayStats;
  rightLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPickDate: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 h-[50px] bg-[#FDFDFE] border-b border-[#121212] flex flex-col items-center justify-center">
      <span className="absolute right-[10px] top-[6px] text-[14px] leading-[1.4] text-[#121212] tabular-nums">
        {rightLabel}
      </span>
      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="이전 날짜"
          className="size-[24px] flex items-center justify-center disabled:opacity-30 active:translate-y-px"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onPickDate}
          aria-label="다른 날짜 선택"
          className="text-[14px] leading-[1.4] text-[#121212]"
        >
          {formatHeaderDate(date)}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="다음 날짜"
          className="size-[24px] flex items-center justify-center disabled:opacity-30 active:translate-y-px"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-right.svg" alt="" width={24} height={24} className="block" aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center gap-[10px] text-[10px] leading-none text-[#121212] tabular-nums">
        <span className="flex items-center gap-[4px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/stat-sun.svg" alt="낮잠" width={16} height={16} className="block" />
          <span>{formatDuration(stats.napMin)}</span>
        </span>
        <span className="flex items-center gap-[4px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/stat-moon.svg" alt="밤잠" width={16} height={16} className="block" />
          <span>{formatDuration(stats.nightMin)}</span>
        </span>
        <span className="flex items-center gap-[4px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/stat-bottle.svg" alt="수유" width={16} height={16} className="block" />
          <span>
            <FeedingStat stats={stats} />
          </span>
        </span>
      </div>
    </div>
  );
}

const PAGE_SIZE = 30;

type DayGroup = { date: string; records: GrowthRecord[] };

export default function GrowthRecordPage() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const { openLoginPrompt } = useLoginPrompt();
  // 진입 즉시 이전에 캐시된 리스트를 그려 깜빡임(빈 화면)을 방지한다.
  const [days, setDays] = useState<DayGroup[]>(() =>
    selectedChild ? (getCachedDays(selectedChild.id) ?? []) : [],
  );
  const [cursor, setCursor] = useState<string>(todayString());
  const [hasMore, setHasMore] = useState(true);
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const [quickTypes, setQuickTypes] = useState<GrowthType[]>(() => {
    return normalizeQuickTypes(getCachedQuickTypes() as GrowthType[] | undefined);
  });
  const [loadingMore, setLoadingMore] = useState(false);
  // 최초 진입/아이 전환 시 첫 조회가 끝날 때까지 true (캐시가 있으면 리스트를 그대로 보여줌)
  const [initialLoading, setInitialLoading] = useState(true);
  // 기록 추가/수정/삭제/날짜 이동 등 사용자 액션에 의한 갱신 중 여부
  const [busy, setBusy] = useState(false);
  const [showBusy, setShowBusy] = useState(false);
  const busyCountRef = useRef(0);
  // 캐시된 리스트를 보여주는 동안 뒤에서 최신 데이터를 받아오는 중인지
  // (초기 진입 · 앱 복귀 시의 조용한 갱신을 사용자에게 알리기 위함)
  const [syncing, setSyncing] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const syncCountRef = useRef(0);
  // 카테고리 버튼 연타로 같은 기록이 중복 생성되는 것 방지
  const creatingRef = useRef(false);
  const [sheetType, setSheetType] = useState<GrowthType | null>(null);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [showAddQuick, setShowAddQuick] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrowthRecord | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  // 스크롤은 기록 리스트 상자 안에서만 일어난다(제목·아이 카드·기록 버튼은 고정).
  // 당겨서 새로고침·스와이프 닫기·더 불러오기가 모두 이 요소를 기준으로 한다.
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  // 리스트가 어느 날짜부터 불러왔는지 — 날짜 머리의 '다음 날짜(>)' 버튼을 켤지 정한다
  const [listStart, setListStart] = useState<string>(() => todayString());
  // 날짜 머리 화살표로 이미 불러온 다른 날짜로 넘어갈 때, 그 날짜 머리가 리스트 맨 위에 오도록 스크롤
  const scrollToDay = useCallback((date: string) => {
    const scroller = listScrollRef.current;
    if (!scroller) return;
    const el = scroller.querySelector<HTMLElement>(`[data-day="${date}"]`);
    if (!el) return;
    const top =
      scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + 1;
    scroller.scrollTo({ top, behavior: 'smooth' });
  }, []);
  useLockAppScroll();
  // 당겨서 새로고침(pull-to-refresh)
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);

  const beginBusy = useCallback(() => {
    busyCountRef.current += 1;
    setBusy(true);
  }, []);
  const endBusy = useCallback(() => {
    busyCountRef.current = Math.max(0, busyCountRef.current - 1);
    if (busyCountRef.current === 0) setBusy(false);
  }, []);

  const beginSync = useCallback(() => {
    syncCountRef.current += 1;
    setSyncing(true);
  }, []);
  const endSync = useCallback(() => {
    syncCountRef.current = Math.max(0, syncCountRef.current - 1);
    if (syncCountRef.current === 0) setSyncing(false);
  }, []);

  // 응답이 아주 빠를 때 오버레이가 깜빡이지 않도록 150ms 뒤에만 표시
  useEffect(() => {
    if (!busy) {
      setShowBusy(false);
      return;
    }
    const t = setTimeout(() => setShowBusy(true), 150);
    return () => clearTimeout(t);
  }, [busy]);

  // 갱신 인디케이터도 동일하게 아주 빠른 응답에서는 표시하지 않는다
  useEffect(() => {
    if (!syncing) {
      setShowSync(false);
      return;
    }
    const t = setTimeout(() => setShowSync(true), 200);
    return () => clearTimeout(t);
  }, [syncing]);

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
    const loadInitial = async () => {
      setHasMore(true);
      const today = todayString();
      const targets: string[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) targets.push(shiftDate(today, -i));
      const from = targets[targets.length - 1];
      // 주소는 tabData 의 recordPageInitUrl — 홈에서 미리 받은 응답과 같은 주소라야 캐시가 맞물린다
      const url = recordPageInitUrl(selectedChild.id, today);
      const groupInit = (data: { records?: GrowthRecord[] }) => {
        const dateMap = new Map<string, GrowthRecord[]>();
        for (const r of data.records ?? []) {
          const dt = new Date(r.startAt);
          const pad = (n: number) => String(n).padStart(2, '0');
          const d = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
          if (!dateMap.has(d)) dateMap.set(d, []);
          dateMap.get(d)!.push(r);
        }
        return targets
          .map((d) => ({ date: d, records: dateMap.get(d) ?? [] }))
          .filter((g) => g.records.length > 0);
      };
      // 아이 전환/진입 시 리스트를 비우지 않고, 해당 아이의 캐시를 먼저 보여준다.
      // 이 화면에서 본 적이 없어도 홈에서 미리 받아 둔 응답이 있으면 그걸로 그린다.
      // (둘 다 없을 때만 빈 배열 — 새 데이터가 도착하면 조용히 교체)
      const prefetched = peekCached<{ records?: GrowthRecord[] }>(url);
      setDays(getCachedDays(selectedChild.id) ?? (prefetched ? groupInit(prefetched) : []));

      try {
        const data = await fetchAndCache<{
          records?: GrowthRecord[];
          quickButtons?: unknown;
          earliestDate?: string | null;
        }>(url);
        if (data) {
          if (cancelled) return;
          const nextQuick = normalizeQuickTypes(data.quickButtons as GrowthType[] | undefined);
          setQuickTypes(nextQuick);
          setCachedQuickTypes(nextQuick);
          const earliest = data.earliestDate ?? null;
          setEarliestDate(earliest);
          const grouped = groupInit(data);
          setDays(grouped);
          setCachedDays(selectedChild.id, grouped);
          const nextCursor = shiftDate(from, -1);
          setCursor(nextCursor);
          if (!earliest || nextCursor < earliest) setHasMore(false);
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
      setCachedDays(selectedChild.id, next);
      const nextCursor = shiftDate(targets[targets.length - 1], -1);
      setCursor(nextCursor);
      if (!earliest || nextCursor < earliest) setHasMore(false);
    };
    const init = async () => {
      setInitialLoading(true);
      beginSync();
      try {
        await loadInitial();
      } finally {
        if (!cancelled) setInitialLoading(false);
        endSync();
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [selectedChild, fetchDay, beginSync, endSync]);

  // 리프레시/갱신 — 기존 리스트를 유지한 채 새 데이터가 도착하면 교체한다.
  // (리스트를 비우지 않음) silent=true면 인디케이터 없이 조용히 갱신한다.
  const reload = useCallback(
    async (fromDate?: string, opts?: { silent?: boolean }) => {
      if (!selectedChild) return;
      const silent = opts?.silent ?? false;
      if (silent) beginSync();
      else beginBusy();
      try {
        const start = fromDate ?? todayString();
        const from = shiftDate(start, -(PAGE_SIZE - 1));
        const to = start;
        const res = await fetch(
          `/api/growth-records/page-init?childId=${encodeURIComponent(selectedChild.id)}&from=${from}&to=${to}`,
        );
        if (res.ok) {
          const data = await res.json();
          const earliest: string | null = data.earliestDate ?? null;
          setEarliestDate(earliest);
          setListStart(start);
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
          setCachedDays(selectedChild.id, grouped);
          const nextCursor = shiftDate(from, -1);
          setCursor(nextCursor);
          setHasMore(!(!earliest || nextCursor < earliest));
        }
      } finally {
        if (silent) endSync();
        else endBusy();
      }
    },
    [selectedChild, beginBusy, endBusy, beginSync, endSync],
  );

  // 카테고리(기록 항목) 클릭 시 바텀시트 없이 기본값으로 기록 즉시 생성
  const createQuickRecord = useCallback(
    async (type: GrowthType) => {
      if (!selectedChild || creatingRef.current) return;
      creatingRef.current = true;
      beginBusy();
      const now = new Date();
      const cfg = TYPE_CONFIG[type];
      const fd = new FormData();
      fd.append('childId', selectedChild.id);
      fd.append('type', type);
      fd.append('startAt', now.toISOString());
      if (cfg.showEndPicker) {
        fd.append('endAt', now.toISOString());
      }
      fd.append('memo', '');
      fd.append('data', JSON.stringify(buildDefaultRecordData(type)));
      fd.append('keepImageUrls', JSON.stringify([]));
      try {
        const res = await fetch('/api/growth-records', {
          method: 'POST',
          body: fd,
        });
        if (res.ok) {
          reloadWidget();
          // 오버레이가 이미 떠 있으므로 목록 갱신은 조용히
          await reload(undefined, { silent: true });
        }
      } finally {
        creatingRef.current = false;
        endBusy();
      }
    },
    [selectedChild, reload, beginBusy, endBusy],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      beginBusy();
      try {
        const res = await fetch(`/api/growth-records/${id}`, { method: 'DELETE' });
        if (res.ok) {
          reloadWidget();
          setDays((prev) => {
            const next = prev
              .map((g) => ({ ...g, records: g.records.filter((r) => r.id !== id) }))
              .filter((g) => g.records.length > 0);
            if (selectedChild) setCachedDays(selectedChild.id, next);
            return next;
          });
          setSwipedRowId(null);
        }
      } finally {
        endBusy();
      }
    },
    [selectedChild, beginBusy, endBusy],
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
    const scroller = listScrollRef.current;
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
      scroller?.removeEventListener('scroll', onScroll);
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
    const onPageShow = () => reload(undefined, { silent: true });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reload(undefined, { silent: true });
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
      { root: listScrollRef.current, rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // 당겨서 새로고침: 스크롤 최상단에서 아래로 당기면 기록 리스트 재조회
  useEffect(() => {
    if (!selectedChild) return;
    const THRESHOLD = 64; // 이 이상 당기면 새로고침 실행
    const MAX = 96; // 최대 당김 거리
    const RESIST = 0.5; // 당김 저항(고무줄 느낌)
    const setDist = (d: number) => {
      pullDistanceRef.current = d;
      setPullDistance(d);
    };
    const overlayOpen = () =>
      sheetType !== null ||
      editing !== null ||
      showAddQuick ||
      showDatePicker ||
      deleteTarget !== null ||
      busy;

    const scroller = listScrollRef.current;
    if (!scroller) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || overlayOpen()) return;
      if (scroller.scrollTop > 0 || pullDistanceRef.current !== 0) return;
      if (e.touches.length !== 1) return;
      pullStartYRef.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartYRef.current === null) return;
      if (scroller.scrollTop > 0) {
        pullStartYRef.current = null;
        setDist(0);
        return;
      }
      const dy = e.touches[0].clientY - pullStartYRef.current;
      if (dy <= 0) {
        setDist(0);
        return;
      }
      // 위로 당기는 동안 브라우저 기본 새로고침/바운스 방지
      e.preventDefault();
      setDist(Math.min(MAX, dy * RESIST));
    };
    const onTouchEnd = () => {
      if (pullStartYRef.current === null) return;
      pullStartYRef.current = null;
      if (pullDistanceRef.current >= THRESHOLD) {
        setRefreshing(true);
        setDist(THRESHOLD);
        // 당김 인디케이터가 이미 표시되므로 오버레이는 띄우지 않음
        Promise.resolve(reload(undefined, { silent: true })).finally(() => {
          setRefreshing(false);
          setDist(0);
        });
      } else {
        setDist(0);
      }
    };

    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [
    selectedChild,
    refreshing,
    reload,
    sheetType,
    editing,
    showAddQuick,
    showDatePicker,
    deleteTarget,
    busy,
  ]);

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

  // 아이 목록을 읽기 전(!isLoaded)에도 화면 전체를 가리지 않고,
  // 기록 리스트 자리에서만 로딩을 보여준다.
  const noChild = isLoaded && !selectedChild;
  const listLoading =
    !noChild && (!isLoaded || (initialLoading && sortedDays.length === 0));
  const today = todayString();

  const pullProgress = Math.min(1, pullDistance / 64);

  const twinGroups = groupTwins(children);
  const currentGroup = selectedChild
    ? (twinGroups.find((g) => g.some((c) => c.id === selectedChild.id)) ?? [selectedChild])
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
        // 화면 높이에 딱 맞춘다 — 기록 리스트만 그 안에서 스크롤한다(패턴·원더윅스와 같은 틀)
        height: 'var(--app-h, 100dvh)',
        fontFamily: PIXEL_FONT,
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 탭바가 가리지 않는다.
        paddingBottom: 'calc(var(--bottom-nav-space) + 10px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 다른 픽셀 화면과 같은 링크다. */}
      <link rel="stylesheet" href={PIXEL_FONT_HREF} />
      <header className={`${BOX} h-[48px] shrink-0 flex items-center justify-center px-[10px]`}>
        <h1 className="text-[#121212] text-[16px] leading-none font-normal">기록</h1>
      </header>

        {!isLoaded ? (
          // 아이 정보 로딩 중 — 아이 카드 높이만큼 자리만 잡아 화면이 튀지 않게 한다
          <div className="h-[50px] shrink-0" aria-hidden="true" />
        ) : noChild ? (
          <div className="shrink-0 flex">
            <NoChildBox
              sub="아기를 추가하면 기록을 시작할 수 있어요"
              loginMessage="로그인하고 우리 아기의 기록을 시작하세요."
            />
          </div>
        ) : currentGroup && age ? (
          // 아이 카드 — 쌍둥이는 한 카드에 같이(패턴·원더윅스와 같은 카드)
          <div className="shrink-0 flex">
            <ChildSwitcher
              current={toGroup(currentGroup)}
              groups={twinGroups.map(toGroup)}
              ageParts={[`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`]}
              onSelect={(key) => {
                const next = children.find((c) => c.id === key);
                if (next) selectChild(next);
              }}
            />
          </div>
        ) : null}

        {/* 기본 7개 기록과 설정을 한 줄 가로 스크롤로 표시한다. */}
        {/* 물결 테두리가 버튼 밖으로 3px 남짓 나와서 줄 안쪽에 여유(py)를 둔다 */}
        <div data-quick-bar-root className="shrink-0 -mx-[20px] -my-[5px]">
          <div
            className="overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="inline-flex items-start gap-[10px] px-[20px] py-[5px] align-top">
              {visibleQuickTypes.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const style = CATEGORY_STYLE[t];
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!isLoaded}
                    onClick={() => {
                      if (noChild) {
                        openLoginPrompt('로그인하고 우리 아기의 기록을 시작하세요.');
                        return;
                      }
                      createQuickRecord(t);
                    }}
                    aria-label={cfg.label}
                    className="w-[50px] shrink-0 flex flex-col items-center gap-[4px]"
                  >
                    <div
                      className="size-[50px] rounded-[4px] border flex items-center justify-center active:translate-y-px"
                      style={{
                        borderColor: style.border,
                        // 기록 색은 5% 투명이라 흰 바탕 위에 겹쳐 불투명하게 칠한다
                        background: `linear-gradient(${style.bg}, ${style.bg}), #FDFDFE`,
                      }}
                    >
                      {RECORD_EMOJI[t] ?? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={RECORD_ICONS[t]}
                          alt=""
                          width={32}
                          height={32}
                          aria-hidden="true"
                          className="block"
                        />
                      )}
                    </div>
                    <span className="text-[12px] leading-[1.4] text-[#121212] whitespace-nowrap">
                      {t === 'FORMULA' ? '분유수유' : t === 'BREASTFEEDING' ? '모유수유' : cfg.label}
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
                className="w-[50px] shrink-0 flex flex-col items-center gap-[4px]"
                aria-label="기록 항목 설정"
              >
                <div className="size-[50px] rounded-[4px] border border-[#BBC0C5] bg-[#FDFDFE] flex items-center justify-center active:translate-y-px">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-settings.svg"
                    alt=""
                    width={24}
                    height={24}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[12px] leading-[1.4] text-[#121212] whitespace-nowrap">설정</span>
              </button>
            </div>
          </div>
        </div>

        {/* 기록 리스트 — 화면에서 이 상자만 스크롤한다. 아래는 탭바와 10px 띄운다. */}
        <div className={`${BOX} flex-1 min-h-0 flex flex-col overflow-hidden relative`}>
          {/* 백그라운드 갱신 인디케이터 — 캐시된 리스트를 보여주는 동안
              최신 기록을 받아오는 중임을 알린다(레이아웃은 밀지 않음) */}
          {showSync && !listLoading && !refreshing && (
            <div
              className="absolute top-[8px] inset-x-0 z-20 flex justify-center pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <div className={`${BOX} flex items-center px-2 py-1.5 text-[#808991]`}>
                <Loading size={14} label="최신 기록 불러오는 중" />
              </div>
            </div>
          )}
          <div
            ref={listScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col"
          >
      {/* 당겨서 새로고침 인디케이터 — 평소 숨김, 아래로 당기면 컨텐츠 상단에 나타남 */}
      <div
        className="shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          height: refreshing ? 44 : pullDistance,
          transition:
            refreshing || pullDistance === 0 ? 'height 0.3s ease' : 'none',
        }}
        aria-hidden={!refreshing && pullDistance === 0}
      >
        {refreshing ? (
          <Loading size={18} className="text-[#808991]" label="새로고침 중" />
        ) : (
        <div
          className="flex items-center gap-1.5 text-[#808991]"
          style={{ opacity: pullProgress }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              transform: `rotate(${pullProgress >= 1 ? 180 : 0}deg)`,
              transition: 'transform 0.2s ease',
            }}
          >
            <path
              d="M12 5v14M12 19l-6-6M12 19l6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs whitespace-nowrap">
            {pullProgress >= 1 ? '놓으면 새로고침' : '아래로 당겨 새로고침'}
          </span>
        </div>
        )}
      </div>

        {listLoading ? (
          <ListLoading />
        ) : noChild || (sortedDays.length === 0 && !hasMore) ? (
          // 기록이 하나도 없을 때 — 오늘 날짜 머리(합계 0)와 안내 문구만
          <section className="flex-1 flex flex-col">
            <DayHeader
              date={today}
              stats={computeDayStats([])}
              rightLabel="오늘"
              canPrev={false}
              canNext={false}
              onPrev={() => {}}
              onNext={() => {}}
              onPickDate={() => {
                if (noChild) {
                  openLoginPrompt('로그인하고 우리 아기의 기록을 시작하세요.');
                  return;
                }
                setShowDatePicker(true);
              }}
            />
            <div className="flex-1 flex items-center justify-center px-[20px] py-12 text-center">
              <p className="text-[14px] leading-[1.4] text-[#808991]">등록된 기록이 없습니다.</p>
            </div>
          </section>
        ) : sortedDays.length === 0 ? (
          // 최근 30일에 기록이 없어 과거 구간을 백필하는 중 (sentinel이 loadMore 트리거)
          <div ref={sentinelRef} className="py-16 flex flex-col items-center gap-2">
            <Spinner size={22} />
          </div>
        ) : (
          <div>
            {sortedDays.map((group, groupIdx) => {
              const stats = computeDayStats(group.records);
              const isToday = group.date === today;
              const dDay = selectedChild?.birthDate
                ? dayOfLife(selectedChild.birthDate, group.date)
                : null;
              const olderLoaded = groupIdx < sortedDays.length - 1;
              const newerLoaded = groupIdx > 0;
              return (
                <section
                  key={group.date}
                  data-day={group.date}
                >
                  <DayHeader
                    date={group.date}
                    stats={stats}
                    rightLabel={isToday ? '오늘' : dDay !== null ? `D+${dDay}` : ''}
                    canPrev={olderLoaded || hasMore}
                    canNext={newerLoaded || listStart < today}
                    onPrev={() => {
                      if (olderLoaded) scrollToDay(sortedDays[groupIdx + 1].date);
                      else loadMore();
                    }}
                    onNext={() => {
                      if (newerLoaded) scrollToDay(sortedDays[groupIdx - 1].date);
                      else reload();
                    }}
                    onPickDate={() => setShowDatePicker(true)}
                  />

                  {/* 기록 행 */}
                  <div>
                    {group.records.map((r) => {
                      const catStyle = CATEGORY_STYLE[r.type] ?? CATEGORY_STYLE.ETC;
                      const summary = summarizeRecord(r);
                      const title =
                        r.type === 'SLEEP'
                          ? ((r.data as Record<string, unknown> | null)?.kind === 'NIGHT'
                              ? '밤잠'
                              : '낮잠')
                          : recordTitle(r.type);
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
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              setSheetType(r.type);
                            }}
                            className="w-full min-h-[66px] text-left flex items-center justify-between gap-[10px] p-[10px] active:bg-[#F7F8F9]"
                          >
                            <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
                              <div className="flex items-center gap-[10px] text-[16px] leading-[1.4] text-[#121212]">
                                <span
                                  className="size-[10px] rounded-full shrink-0"
                                  style={{ backgroundColor: catStyle.border }}
                                  aria-hidden="true"
                                />
                                <span className="shrink-0 tabular-nums">{formatTime24(r.startAt)}</span>
                                <span className="shrink-0" aria-hidden="true">･</span>
                                <span className="min-w-0 truncate">{title}</span>
                              </div>
                              {(summary || r.memo || urls.length > 0) && (
                                <div className="pl-[94px] flex flex-col gap-[4px] min-w-0">
                                  {summary && (
                                    <p className="text-[14px] leading-[1.4] text-[#808991]">{summary}</p>
                                  )}
                                  {r.memo && (
                                    <p className="text-[12px] leading-[1.4] text-[#808991] line-clamp-2">
                                      {r.memo}
                                    </p>
                                  )}
                                  {urls.length > 0 && (
                                    <div className="mt-[4px] flex gap-1.5 overflow-x-auto scrollbar-hide">
                                      {urls.map((u: string) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          key={u}
                                          src={u}
                                          alt=""
                                          className="shrink-0 w-16 h-16 object-cover rounded-[4px] border border-[#121212]"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/icons/chevron-right.svg"
                              alt=""
                              width={24}
                              height={24}
                              className="block shrink-0"
                              aria-hidden="true"
                            />
                          </button>
                        </SwipeableRow>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="py-6 flex items-center justify-center gap-2 text-xs text-[#808991]"
              >
                {loadingMore ? <Spinner size={16} /> : null}
              </div>
            )}
          </div>
        )}
          </div>
        </div>

        {/* 탭바는 화면 아래에 떠 있다 — 그 자리만큼 비워 둔다 */}
        <div className="shrink-0" style={{ height: TAB_BAR_HEIGHT }} aria-hidden />

      {sheetType && selectedChild && (
        <EntrySheet
          key={`${selectedChild.id}:${sheetType}:${editing?.id ?? 'new'}`}
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

      <RecordDatePopup
        open={showDatePicker}
        value={todayString()}
        birthDate={selectedChild?.birthDate ?? null}
        max={todayString()}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d: string) => reload(d)}
      />

      {/* 저장/삭제/날짜 이동 등 갱신 중 — 화면이 멈춘 것처럼 보이지 않도록 오버레이 표시
          (150ms 안에 끝나면 나타나지 않음) */}
      {showBusy && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10"
          role="status"
          aria-live="polite"
        >
          <div className={`${BOX} flex items-center justify-center px-6 py-5`}>
            <Spinner size={26} />
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        showThumbnail={false}
        title="기록을 삭제할까요?"
        description={'삭제한 기록은 다시 불러올 수 없어요.\n삭제 후에는 패턴에 반영되지 않아요.'}
        confirmLabel="삭제하기"
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) deleteRecord(target.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PixelTabBar active="record" />
    </div>
  );
}
