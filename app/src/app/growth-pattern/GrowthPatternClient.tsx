'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import EmptyChildState from '@/components/EmptyChildState';
import ChildSelector from '@/components/ChildSelector';
import PageHeader from '@/components/PageHeader';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';
import { calcChildAge } from '@/lib/childAge';
import {
  MENU_TYPES,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  RECORD_ICONS,
  CATEGORY_STYLE,
} from '../growth-record/types';

const KO_DAY = ['일', '월', '화', '수', '목', '금', '토'];

const TYPE_CHART_COLOR: Record<GrowthType, string> = {
  FORMULA: '#FF5675',
  BREASTFEEDING: '#FF7C5A',
  PUMPED_FEEDING: '#FFC951',
  PUMPING: '#ACE070',
  BABY_FOOD: '#6CC68A',
  SLEEP: '#6A92EA',
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

const STORAGE_KEY = 'growth-pattern:selectedTypes';

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
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${KO_DAY[d.getDay()]})`;
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
 * endAt 이 없는 기록에 시각화용 합성(endAt) 을 부여한다.
 * - 기본 지속시간: 10분
 * - 같은 startAt 에 2개 있으면 각 5분, 3개 있으면 각 3분(N개면 각 ⌊10/N⌋분)으로 순차 분할
 * - 그룹의 합성 종료가 다음 그룹의 startAt 을 넘으면 다음 startAt 까지로 잘라낸다.
 */
function withSyntheticEnd(records: GrowthRecord[]): GrowthRecord[] {
  const withEnd: GrowthRecord[] = [];
  const withoutEnd: GrowthRecord[] = [];
  for (const r of records) {
    if (r.endAt) withEnd.push(r);
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

function formatDuration(mins: number): string {
  if (mins <= 0) return '0분';
  const m = Math.round(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}분`;
  if (rem === 0) return `${h}시간`;
  return `${h}시간 ${rem}분`;
}

interface DayStats {
  awakeMin: number;
  sleepMin: number;
  feedingMl: number;
  formulaMl: number;
  pumpedMl: number;
  breastMin: number;
}

function computeDayStats(records: GrowthRecord[], dateStr: string, todayStr: string): DayStats {
  let sleepMin = 0;
  let formulaMl = 0;
  let pumpedMl = 0;
  let otherFeedingMl = 0;
  let breastMin = 0;
  for (const r of records) {
    const data = (r.data ?? {}) as Record<string, unknown>;
    if (r.type === 'SLEEP' && r.endAt) {
      sleepMin += Math.max(
        0,
        Math.round(
          (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 60000,
        ),
      );
    }
    if (r.type === 'FORMULA' || r.type === 'PUMPED_FEEDING' || r.type === 'MILK') {
      const ml = Number(data.amountMl);
      if (!Number.isNaN(ml)) {
        if (r.type === 'FORMULA') formulaMl += ml;
        else if (r.type === 'PUMPED_FEEDING') pumpedMl += ml;
        else otherFeedingMl += ml;
      }
    }
    if (r.type === 'BREASTFEEDING') {
      const left = Number(data.leftMin) || 0;
      const leftS = Number(data.leftSec) || 0;
      const right = Number(data.rightMin) || 0;
      const rightS = Number(data.rightSec) || 0;
      breastMin += left + right + Math.round((leftS + rightS) / 60);
    }
  }
  let dayLengthMin: number;
  if (dateStr === todayStr) {
    const now = new Date();
    dayLengthMin = now.getHours() * 60 + now.getMinutes();
  } else {
    dayLengthMin = 24 * 60;
  }
  const awakeMin = Math.max(0, dayLengthMin - sleepMin);
  const feedingMl = formulaMl + pumpedMl + otherFeedingMl;
  return { sleepMin, awakeMin, feedingMl, formulaMl, pumpedMl, breastMin };
}

export default function GrowthPatternClient() {
  const { children, isLoaded } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
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
  const [quickTypes, setQuickTypes] = useState<GrowthType[]>(DEFAULT_QUICK_TYPES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/growth-quick-buttons');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const saved: GrowthType[] = ((data.types ?? []) as GrowthType[]).filter(
          (t) => (MENU_TYPES as string[]).includes(t),
        );
        if (saved.length > 0) setQuickTypes(saved);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoaded && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [isLoaded, children, selectedChild]);

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

  useEffect(() => {
    if (!selectedChild) return;
    const from = shiftDate(selectedDate, -6);
    const to = selectedDate;
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/growth-records/range?childId=${selectedChild.id}&from=${from}&to=${to}`,
        );
        if (!res.ok) {
          if (!cancelled) {
            setDays({});
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as GrowthRecord[];
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
        if (!cancelled) {
          setDays(map);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDays({});
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChild, selectedDate]);

  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(selectedDate, -(6 - i))),
    [selectedDate],
  );

  // 합성 endAt 적용은 selectedTypes 무관하게 전체 기록에 대해 수행한 뒤 필터
  const daySyntheticRecords = useMemo(
    () => withSyntheticEnd(days[selectedDate] ?? []),
    [days, selectedDate],
  );

  const dayRecords = useMemo(
    () => daySyntheticRecords.filter((r) => selectedTypes.has(r.type)),
    [daySyntheticRecords, selectedTypes],
  );

  // 요약은 합성 전 원본 데이터 기반 (실제 측정값 표시)
  const stats = useMemo(
    () =>
      computeDayStats(
        (days[selectedDate] ?? []).filter((r) => selectedTypes.has(r.type)),
        selectedDate,
        todayStr,
      ),
    [days, selectedDate, selectedTypes, todayStr],
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

  const handlePrev = () => {
    setSelectedDate(shiftDate(selectedDate, viewMode === 'day' ? -1 : -7));
  };
  const handleNext = () => {
    if (!canGoNext) return;
    const step = viewMode === 'day' ? 1 : 7;
    const next = shiftDate(selectedDate, step);
    setSelectedDate(next > todayStr ? todayStr : next);
  };

  if (!isLoaded) return null;
  if (children.length === 0) {
    return (
      <>
        <PageHeader title="패턴" variant="back" />
        <EmptyChildState
          emoji="📊"
          title="패턴"
          description={
            <>
              아기를 등록하면<br />
              하루 리듬을 한눈에 볼 수 있어요.
            </>
          }
        />
      </>
    );
  }

  const rangeLabel =
    viewMode === 'day'
      ? formatDayLabel(selectedDate)
      : `${formatDayLabel(dates[0])} ~ ${formatDayLabel(dates[6])}`;

  const ageDays = selectedChild
    ? calcChildAge(selectedChild.birthDate, fromDateStr(selectedDate)).days
    : 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-white pb-[112px] overflow-hidden">
      <PageHeader title="패턴" variant="back" />
      <div className="px-6 flex flex-col flex-1 min-h-0">
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />

        {/* 일/주 토글 */}
        <div className="mt-4 bg-gray-100 rounded-lg p-1 flex">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`flex-1 py-2 rounded-md text-[14px] font-medium text-black transition-colors ${
              viewMode === 'day' ? 'bg-white' : ''
            }`}
            aria-pressed={viewMode === 'day'}
          >
            일
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex-1 py-2 rounded-md text-[14px] font-medium text-black transition-colors ${
              viewMode === 'week' ? 'bg-white' : ''
            }`}
            aria-pressed={viewMode === 'week'}
          >
            주
          </button>
        </div>

        {/* 카테고리 필터 — 사용자별 저장 순서 */}
        <div className="mt-4 -mx-6">
          <div className="flex gap-[10px] overflow-x-auto scrollbar-hide pb-1 px-6">
            {quickTypes.map((t) => {
              const cfg = TYPE_CONFIG[t];
              const style = CATEGORY_STYLE[t];
              const active = selectedTypes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className="flex flex-col items-center gap-[4px] shrink-0"
                  aria-label={cfg.label}
                  aria-pressed={active}
                >
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden active:scale-95 transition-all ${
                      active ? '' : 'grayscale opacity-50'
                    }`}
                    style={{
                      borderColor: active ? style.border : '#E5E7EB',
                      backgroundColor: active ? style.bg : '#F3F4F6',
                    }}
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
          </div>
        </div>

        {/* 차트 카드 */}
        <div className="mt-4 mb-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="py-3 px-4 shrink-0">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="이전"
                className="w-4 h-4 flex items-center justify-center shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="mx-4 text-[12px] font-semibold text-black active:opacity-70 transition-opacity"
                aria-label="날짜 선택"
              >
                {rangeLabel}
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="다음"
                className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                  canGoNext ? '' : 'opacity-30 pointer-events-none'
                }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {viewMode === 'day' && (
              <div className="mt-3 flex items-center justify-center gap-[10px] tabular-nums flex-wrap">
                <span className="flex items-center gap-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-stat-awake.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-medium text-black">
                    {formatDuration(stats.awakeMin)}
                  </span>
                </span>
                <span className="flex items-center gap-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icon-stat-sleep.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-medium text-black">
                    {formatDuration(stats.sleepMin)}
                  </span>
                </span>
                {(stats.feedingMl > 0 || stats.breastMin > 0) && (
                  <span className="flex items-center gap-[2px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icon-stat-feeding.svg"
                      alt=""
                      width={16}
                      height={16}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-medium text-black">
                      {stats.feedingMl > 0 ? `${stats.feedingMl}ml` : ''}
                      {(stats.formulaMl > 0 || stats.pumpedMl > 0) && (
                        <>
                          (
                          {stats.formulaMl > 0 && (
                            <span style={{ color: CATEGORY_STYLE.FORMULA.border }}>
                              {stats.formulaMl}
                            </span>
                          )}
                          {stats.formulaMl > 0 && stats.pumpedMl > 0 ? '+' : ''}
                          {stats.pumpedMl > 0 && (
                            <span
                              style={{ color: CATEGORY_STYLE.PUMPED_FEEDING.border }}
                            >
                              {stats.pumpedMl}
                            </span>
                          )}
                          )
                        </>
                      )}
                      {stats.breastMin > 0 && (
                        <>
                          {stats.feedingMl > 0 ? '+' : ''}
                          <span style={{ color: CATEGORY_STYLE.BREASTFEEDING.border }}>
                            {stats.breastMin}분
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 pt-3 pb-3 flex-1 min-h-0 flex">
            {viewMode === 'day' ? (
              <DonutChart
                records={dayRecords}
                dateStr={selectedDate}
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
      </div>

      <section className="mt-6 flex justify-center shrink-0">
        <KakaoAdBanner unit="DAN-P9dlZp9cPFgYuYgZ" />
      </section>

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
        <circle cx={CX} cy={CY} r={R_OUTER} fill="#F3F4F6" />
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
            stroke="#BBC0C5"
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}
        {/* 시간 레이블 — regular 10px gray400 */}
        {hourLabels.map((l) => (
          <text
            key={l.h}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontWeight="400"
            fill="#BBC0C5"
          >
            {l.h}
          </text>
        ))}
      </svg>
      {/* 가운데 88x88 영역 — HTML overlay 로 고정 크기 보장 */}
      <div className="absolute w-[88px] h-[88px] rounded-full bg-white flex items-center justify-center pointer-events-none">
        <span className="text-[12px] font-normal text-black tabular-nums">
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
  const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
  const hasToday = dates.includes(todayStr);
  const now = new Date();
  const nowMinPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* 차트 영역 — 7개 컬럼이 8px gap 으로 가용 폭을 균등 분할 */}
        <div className="flex-1 relative grid grid-cols-7 gap-2">
          {/* 시간당 horizontal border — gray200 1px. 마지막 라벨(21)이 차트 하단에 오도록 균등 분할 위치에 그린다. */}
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-gray-200 pointer-events-none z-[1]"
              style={{ top: `${(i / (HOURS.length - 1)) * 100}%` }}
            />
          ))}
          {dates.map((date) => (
            <div
              key={date}
              className="bg-gray-100 relative"
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
              className="absolute left-0 right-0 border-t border-dashed border-blue-400 pointer-events-none z-[2]"
              style={{ top: `${nowMinPct}%` }}
            />
          )}
        </div>
        {/* Y축 시간 레이블 — 각 라벨의 세로 중앙이 해당 border line 과 정확히 일치 (translateY -50%) */}
        <div className="relative w-4 ml-2">
          {HOURS.map((h, i) => {
            const ratio = i / (HOURS.length - 1);
            return (
              <div
                key={h}
                className="absolute right-0 text-[10px] font-normal text-gray-400 leading-none"
                style={{
                  top: `${ratio * 100}%`,
                  transform: 'translateY(-50%)',
                }}
              >
                {pad(h)}
              </div>
            );
          })}
        </div>
      </div>
      {/* X축 날짜 레이블 — 차트와 8px 간격 (mt-2), 컬럼과 동일하게 grid 로 정렬 */}
      <div className="flex mt-2 shrink-0">
        <div className="flex-1 grid grid-cols-7 gap-2">
          {dates.map((date) => {
            const d = fromDateStr(date);
            return (
              <div
                key={date}
                className="text-center text-[10px] font-normal text-gray-400"
              >
                {d.getDate()}일
              </div>
            );
          })}
        </div>
        <div className="w-4 ml-2" />
      </div>
    </div>
  );
}
