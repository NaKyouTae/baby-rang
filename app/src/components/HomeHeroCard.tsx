'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, type Child } from '@/hooks/useChildren';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import EmptyProfileCard from '@/components/EmptyProfileCard';
import { cachedFetch } from '@/hooks/appCache';
import {
  calcChildAge,
  kstYmdToLocalMidnight,
  toKstYmd,
  todayKstYmd,
} from '@/lib/childAge';
import { type GrowthRecord } from '@/app/growth-record/types';

// 원더윅스 폭풍(fussy) 기간 — 출생일 기준 주차 범위
const WONDER_WEEKS_LEAPS = [
  { leap: 1, name: '감각의 변화', startWeek: 4, endWeek: 5 },
  { leap: 2, name: '패턴 생성', startWeek: 7, endWeek: 9 },
  { leap: 3, name: '자연스러운 움직임', startWeek: 11, endWeek: 13 },
  { leap: 4, name: '이벤트', startWeek: 15, endWeek: 19 },
  { leap: 5, name: '관계 형성', startWeek: 23, endWeek: 26 },
  { leap: 6, name: '분류 인지', startWeek: 34, endWeek: 37 },
  { leap: 7, name: '순서 인지', startWeek: 42, endWeek: 46 },
  { leap: 8, name: '유아기 시작', startWeek: 51, endWeek: 54 },
  { leap: 9, name: '원칙 인지', startWeek: 60, endWeek: 64 },
  { leap: 10, name: '시스템', startWeek: 75, endWeek: 79 },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function diffDays(a: Date, b: Date) {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((a0 - b0) / MS_PER_DAY);
}

interface LeapStatus {
  current: { leap: number; name: string; startDate: Date; endDate: Date } | null;
  next: { leap: number; name: string; startDate: Date; endDate: Date; dDay: number } | null;
}

function getLeapStatus(birthDate: Date, today: Date): LeapStatus {
  let current: LeapStatus['current'] = null;
  let next: LeapStatus['next'] = null;

  for (const l of WONDER_WEEKS_LEAPS) {
    const startDate = addDays(birthDate, Math.round(l.startWeek * 7));
    const endDate = addDays(birthDate, Math.round(l.endWeek * 7));

    if (startDate <= today && today <= endDate) {
      current = { leap: l.leap, name: l.name, startDate, endDate };
    } else if (startDate > today && !next) {
      next = {
        leap: l.leap,
        name: l.name,
        startDate,
        endDate,
        dDay: diffDays(startDate, today),
      };
    }
  }
  return { current, next };
}

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface TodayStats {
  feedingCount: number;
  sleepMinutes: number;
  diaperCount: number;
  lastFeedingAt: string | null;
  lastSleepAt: string | null;
  lastDiaperAt: string | null;
}

const EMPTY_STATS: TodayStats = {
  feedingCount: 0,
  sleepMinutes: 0,
  diaperCount: 0,
  lastFeedingAt: null,
  lastSleepAt: null,
  lastDiaperAt: null,
};

function computeStats(records: GrowthRecord[]): TodayStats {
  let feedingCount = 0;
  let sleepMinutes = 0;
  let diaperCount = 0;
  let lastFeedingAt: string | null = null;
  let lastSleepAt: string | null = null;
  let lastDiaperAt: string | null = null;
  const pickLater = (a: string | null, b: string) =>
    !a || new Date(b).getTime() > new Date(a).getTime() ? b : a;
  for (const r of records) {
    if (
      r.type === 'FORMULA' ||
      r.type === 'BREASTFEEDING' ||
      r.type === 'PUMPED_FEEDING' ||
      r.type === 'MILK'
    ) {
      feedingCount += 1;
      lastFeedingAt = pickLater(lastFeedingAt, r.endAt ?? r.startAt);
    } else if (r.type === 'SLEEP') {
      if (r.endAt) {
        sleepMinutes += Math.max(
          0,
          Math.round(
            (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) /
              60000,
          ),
        );
      }
      lastSleepAt = pickLater(lastSleepAt, r.endAt ?? r.startAt);
    } else if (r.type === 'DIAPER') {
      diaperCount += 1;
      lastDiaperAt = pickLater(lastDiaperAt, r.startAt);
    }
  }
  return {
    feedingCount,
    sleepMinutes,
    diaperCount,
    lastFeedingAt,
    lastSleepAt,
    lastDiaperAt,
  };
}

function formatSleep(mins: number): string {
  if (mins <= 0) return '0분';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatLastTime(iso: string | null): string {
  if (!iso) return '기록 없음';
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  if (h < 12) {
    const m = diffMin % 60;
    return m === 0 ? `${h}시간 전` : `${h}시간 ${m}분 전`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ChildHeroCard({
  child,
}: {
  child: Child;
}) {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const { days, months, extraDays } = calcChildAge(child.birthDate);

  useEffect(() => {
    let cancel = false;
    const t = todayStr();
    const url = `/api/growth-records/range?childId=${encodeURIComponent(child.id)}&from=${t}&to=${t}`;
    cachedFetch<GrowthRecord[]>(url, 30_000)
      .then((data) => {
        if (!cancel) setStats(computeStats(data ?? []));
      })
      .catch(() => {
        if (!cancel) setStats(EMPTY_STATS);
      });
    return () => {
      cancel = true;
    };
  }, [child.id]);

  const ageLabel = months > 0 ? `${months}개월 ${extraDays}일` : `${days}일`;

  const today = kstYmdToLocalMidnight(todayKstYmd());
  const birth = kstYmdToLocalMidnight(toKstYmd(child.birthDate));
  const { current, next } = getLeapStatus(birth, today);

  return (
    <div className="h-[208px] rounded-lg overflow-hidden bg-white border border-gray-200">
      <div>
        {/* 프로필 헤더 — 그라데이션 강조 */}
        <div className="relative px-3 pt-3 pb-0 bg-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center text-xl ring-1 ring-primary-400 shrink-0 leading-none">
              {child.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={child.profileImage}
                  alt={child.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex items-center justify-center w-full h-full leading-[1]">{child.gender === 'female' ? '👧🏻' : '👦🏻'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-medium text-black truncate leading-tight">
                {child.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex h-4 items-center justify-center px-1 text-[12px] leading-[12px] font-medium text-white bg-primary-500 rounded-[2px]">
                  D+{days}
                </span>
                <span className="text-[12px] text-black font-normal">{ageLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오늘의 통계 */}
        <Link href="/growth-record" className="block px-3 pt-2.5 pb-2.5 bg-gray-100 active:opacity-95">
          <div className="grid grid-cols-3 gap-1">
            <StatCell
              label="수유"
              value={stats ? `${stats.feedingCount}회` : '—'}
              sub={stats ? formatLastTime(stats.lastFeedingAt) : '—'}
            />
            <StatCell
              label="수면"
              value={stats ? formatSleep(stats.sleepMinutes) : '—'}
              sub={stats ? formatLastTime(stats.lastSleepAt) : '—'}
            />
            <StatCell
              label="기저귀"
              value={stats ? `${stats.diaperCount}회` : '—'}
              sub={stats ? formatLastTime(stats.lastDiaperAt) : '—'}
            />
          </div>
        </Link>
      </div>


      {/* 원더윅스 영역 */}
      <Link
        href={`/wonder-weeks?childId=${encodeURIComponent(child.id)}`}
        className="block px-3 py-2.5 border-t border-gray-100 bg-white active:opacity-80"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-medium text-black shrink-0">원더윅스</span>
            {current ? (
              <span className="text-[10px] font-medium text-primary-500 shrink-0 rounded-[2px] px-1 py-0" style={{ backgroundColor: 'rgba(48,176,199,0.15)' }}>
                진행중
              </span>
            ) : (
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 shrink-0 rounded-[2px] px-1 py-0">
                평온기
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 shrink-0">자세히 <img src="/right-arrow-ico.svg" alt="" width={10} height={10} /></span>
        </div>
        {current ? (
          <div className="text-[12px] text-black mt-1 truncate">
            <span className="font-semibold text-primary-500">
              {current.leap}번째.
            </span>
            <span>
              {' '}{current.name} | {WONDER_WEEKS_LEAPS[current.leap - 1].startWeek}-{WONDER_WEEKS_LEAPS[current.leap - 1].endWeek}주차 ({fmtMD(current.startDate)}-{fmtMD(current.endDate)})
            </span>
          </div>
        ) : next ? (
          <div className="text-[12px] text-black mt-1 truncate">
            다음: {next.leap}번째. {next.name}
            <span className="ml-1 font-bold text-primary-500">D-{next.dDay}</span>
          </div>
        ) : (
          <div className="text-[12px] text-gray-400 mt-1">예정된 원더윅스가 없어요</div>
        )}
      </Link>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded bg-white border border-gray-200 px-1" style={{ height: 74 }}>
      <div className="flex items-center gap-1 leading-none">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-[16px] font-semibold text-primary-500 leading-none mt-1.5">
        {value}
      </div>
      <div className="text-[12px] text-black mt-1 truncate max-w-full">
        {sub}
      </div>
    </div>
  );
}

function ChildrenCarousel({
  children,
  onActiveChange,
}: {
  children: Child[];
  onActiveChange?: (idx: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const totalSlides = children.length + 1; // +1 for add card

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstSlide = el.firstElementChild as HTMLElement | null;
    const slideW = (firstSlide?.clientWidth ?? el.clientWidth) + 12; // card width + gap
    const idx = Math.round(el.scrollLeft / slideW);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      onActiveChange?.(idx);
    }
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-6 px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {children.map((child) => (
          <div
            key={child.id}
            className="snap-center shrink-0"
            style={{ width: '100%', scrollSnapStop: 'always' }}
          >
            <ChildHeroCard child={child} />
          </div>
        ))}
        <div
          className="snap-center shrink-0"
          style={{ width: '100%', scrollSnapStop: 'always' }}
        >
          <EmptyProfileCard
            href="/settings/children"
            ctaLabel="아기 추가하기"
            className="rounded-lg border border-dotted border-gray-200 active:bg-gray-50 transition-colors"
          />
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5">
        {Array.from({ length: Math.max(totalSlides, 1) }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all ${
              i === activeIdx ? 'w-3 h-1 bg-gray-600' : 'w-1 h-1 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function getRoleLabel(parentRole: string | null | undefined): string {
  if (parentRole === 'mom') return '엄마';
  if (parentRole === 'dad') return '아빠';
  return '보호자님';
}

function WelcomeHeader({
  parentRole,
  childName,
}: {
  parentRole: string | null | undefined;
  childName: string | null;
}) {
  const roleLabel = getRoleLabel(parentRole);
  const displayName = childName
    ? `${childName} ${roleLabel}`
    : `아기랑 ${roleLabel}`;
  return (
    <div>
      <div className="text-[20px] font-medium text-black leading-[32px]">
        {displayName},
      </div>
      <div className="text-[20px] font-medium text-black leading-[32px]">
        아기와 행복한 추억 만들어봐요 ☺️
      </div>
    </div>
  );
}

export default function HomeHeroCard() {
  const { isAuthenticated, isLoaded: authLoaded, user } = useAuth();
  const { children, isLoaded: childrenLoaded } = useChildren();
  const { openLoginPrompt } = useLoginPrompt();
  const [activeChildIdx, setActiveChildIdx] = useState(0);

  const activeChildName =
    children.length > 0 && activeChildIdx < children.length
      ? children[activeChildIdx].name
      : null;

  if (!authLoaded) return null;

  // 비로그인 → 로그인 유도
  if (!isAuthenticated) {
    return (
      <>
        <div>
          <div className="text-[20px] font-medium text-black leading-[32px]">
            반가워요,
          </div>
          <div className="text-[20px] font-medium text-black leading-[32px]">
            육아 동반자 아기랑과 함께해요.
          </div>
        </div>
        <div className="pt-4">
          <EmptyProfileCard
            ctaLabel="로그인하고 시작하기"
            onClick={() => openLoginPrompt('로그인하고 우리 아이 맞춤 정보를 확인하세요.')}
          />
          <div className="flex justify-center pt-4">
            <span className="h-2 w-9 rounded-full bg-gray-500/80" />
          </div>
        </div>
      </>
    );
  }

  // 로그인 + 아이 미등록
  if (childrenLoaded && children.length === 0) {
    return (
      <>
        <div>
          <div className="text-[20px] font-medium text-black leading-[32px]">
            반가워요,
          </div>
          <div className="text-[20px] font-medium text-black leading-[32px]">
            첫 아기를 등록해 보세요.
          </div>
        </div>
        <div className="pt-4">
          <EmptyProfileCard href="/settings/children" ctaLabel="아기 추가하기" />
        </div>
      </>
    );
  }

  if (!childrenLoaded || children.length === 0) {
    return <WelcomeHeader parentRole={user?.parentRole} childName={null} />;
  }

  return (
    <>
      <WelcomeHeader parentRole={user?.parentRole} childName={activeChildName} />
      <div className="pt-4">
        <ChildrenCarousel children={children} onActiveChange={setActiveChildIdx} />
      </div>
    </>
  );
}
