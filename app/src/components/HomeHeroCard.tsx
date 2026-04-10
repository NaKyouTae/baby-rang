'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, type Child } from '@/hooks/useChildren';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
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

function getTimeGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 5) return { text: '늦은 밤이에요', emoji: '🌙' };
  if (h < 11) return { text: '좋은 아침이에요', emoji: '☀️' };
  if (h < 14) return { text: '좋은 점심이에요', emoji: '🌤️' };
  if (h < 18) return { text: '좋은 오후예요', emoji: '🌿' };
  if (h < 22) return { text: '좋은 저녁이에요', emoji: '🌆' };
  return { text: '편안한 밤이에요', emoji: '🌙' };
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
    fetch(
      `/api/growth-records/range?childId=${encodeURIComponent(child.id)}&from=${t}&to=${t}`,
      { cache: 'no-store' },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: GrowthRecord[]) => {
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
    <div className="rounded-2xl overflow-hidden bg-white border border-primary-200 shadow-[0_8px_24px_-12px_rgba(255,199,44,0.25)] ring-1 ring-primary-100">
      <div>
        {/* 프로필 헤더 — 그라데이션 강조 */}
        <div className="relative px-4 pt-3.5 pb-3 bg-gradient-to-br from-primary-50 via-white to-primary-100">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary-400 to-primary-300" />
              <div className="relative w-12 h-12 rounded-full bg-white overflow-hidden flex items-center justify-center text-2xl ring-2 ring-white leading-none">
                {child.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={child.profileImage}
                    alt={child.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full leading-[1]">{child.gender === 'female' ? '👧' : '👦'}</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="text-[17px] font-extrabold text-gray-900 truncate leading-tight">
                  {child.name}
                </div>
                <span
                  className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full font-bold ${
                    child.gender === 'female'
                      ? 'bg-pink-100 text-pink-600'
                      : 'bg-sky-100 text-sky-600'
                  }`}
                  style={{ fontSize: '11px', lineHeight: 1, paddingTop: '1px' }}
                  aria-label={child.gender === 'female' ? '여아' : '남아'}
                >
                  {child.gender === 'female' ? '♀' : '♂'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-full">
                  D+{days}
                </span>
                <span className="text-[11px] text-gray-600 font-medium">{ageLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오늘의 통계 */}
        <Link href="/growth-record" className="block px-3 py-3 bg-white active:opacity-95">
          <div className="grid grid-cols-3 gap-2">
            <StatCell
              icon="🍼"
              label="수유"
              value={stats ? `${stats.feedingCount}회` : '—'}
              sub={stats ? formatLastTime(stats.lastFeedingAt) : '—'}
            />
            <StatCell
              icon="😴"
              label="수면"
              value={stats ? formatSleep(stats.sleepMinutes) : '—'}
              sub={stats ? formatLastTime(stats.lastSleepAt) : '—'}
            />
            <StatCell
              icon="🩲"
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
        className="block px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 active:opacity-80"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-gray-700 shrink-0">원더윅스</span>
            {current ? (
              <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full shrink-0">
                진행중
              </span>
            ) : (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                평온기
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">자세히 ›</span>
        </div>
        {current ? (
          <div className="text-[11px] text-gray-700 mt-1 truncate">
            <span className="font-semibold text-primary-700">
              Leap {current.leap}. {current.name}
            </span>
            <span className="text-gray-500">
              {' '}
              · {fmtMD(current.startDate)} ~ {fmtMD(current.endDate)}
            </span>
          </div>
        ) : next ? (
          <div className="text-[11px] text-gray-500 mt-1 truncate">
            다음: Leap {next.leap}. {next.name}
            <span className="ml-1 font-bold text-primary-600">D-{next.dDay}</span>
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 mt-1">예정된 원더윅스가 없어요</div>
        )}
      </Link>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-primary-50/60 ring-1 ring-primary-200/70 py-2 px-1">
      <div className="flex items-center gap-1 leading-none">
        <span className="text-[13px]">{icon}</span>
        <span className="text-[10px] font-semibold text-primary-600">{label}</span>
      </div>
      <div className="text-[14px] font-extrabold text-gray-900 leading-none mt-1.5">
        {value}
      </div>
      <div className="text-[10px] text-gray-400 mt-1 truncate max-w-full">
        {sub}
      </div>
    </div>
  );
}

function AddChildCard() {
  return (
    <Link
      href="/settings/children"
      className="rounded-2xl overflow-hidden bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-12 active:bg-gray-50 transition-colors"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-gray-400">아이 추가하기</span>
    </Link>
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
    const slideW = el.clientWidth - 40 + 12; // card width + gap
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
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-5"
        style={{ scrollbarWidth: 'none' }}
      >
        {children.map((child) => (
          <div
            key={child.id}
            className="snap-center shrink-0"
            style={{ width: 'calc(100% - 40px)', scrollSnapStop: 'always' }}
          >
            <ChildHeroCard child={child} />
          </div>
        ))}
        <div
          className="snap-center shrink-0"
          style={{ width: 'calc(100% - 40px)', scrollSnapStop: 'always' }}
        >
          <AddChildCard />
        </div>
      </div>
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'w-4 bg-primary-500' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getRoleLabel(parentRole: string | null | undefined): string {
  if (parentRole === 'mom') return '어머님';
  if (parentRole === 'dad') return '아버님';
  return '보호자님';
}

function WelcomeHeader({
  parentRole,
  childName,
}: {
  parentRole: string | null | undefined;
  childName: string | null;
}) {
  const greeting = getTimeGreeting();
  const roleLabel = getRoleLabel(parentRole);
  const displayName = childName
    ? `${childName} ${roleLabel}`
    : `아기랑 ${roleLabel}`;
  return (
    <div className="px-5">
      <div className="text-[18px] font-extrabold text-gray-900 leading-tight">
        {displayName}, {greeting.text} {greeting.emoji}
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
    const greeting = getTimeGreeting();
    return (
      <>
        <div className="px-5">
          <div className="text-[18px] font-extrabold text-gray-900 leading-tight">
            안녕하세요, {greeting.text}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            오늘도 아기랑 함께해요 {greeting.emoji}
          </div>
        </div>
        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={() => openLoginPrompt('로그인하고 우리 아이 맞춤 정보를 확인하세요.')}
            className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary-500 to-primary-400 px-5 py-4 shadow-[0_10px_24px_-10px_rgba(255,199,44,0.45)] ring-1 ring-primary-300/40 active:opacity-95"
          >
            <div className="min-w-0 text-left">
              <div className="text-[15px] font-extrabold text-white">
                로그인하고 시작하기
              </div>
              <div className="text-[11px] text-white/80 mt-1">
                우리 아이 맞춤 정보를 볼 수 있어요
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary-700 bg-white shrink-0 ml-3 px-3 py-1.5 rounded-full shadow-sm">
              로그인 <span aria-hidden>›</span>
            </span>
          </button>
        </div>
      </>
    );
  }

  // 로그인 + 아이 미등록
  if (childrenLoaded && children.length === 0) {
    return (
      <>
        <WelcomeHeader parentRole={user?.parentRole} childName={null} />
        <div className="px-5 pt-3">
          <div className="rounded-2xl bg-white border border-gray-300 px-5 py-4 shadow-sm">
            <div className="text-[14px] font-bold text-gray-900">
              아직 등록된 아이가 없어요
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              등록하면 맞춤 정보와 기록을 볼 수 있어요
            </div>
            <Link
              href="/settings/children"
              className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-primary-500 text-white text-[13px] font-bold py-3 active:bg-primary-600 shadow-sm"
            >
              우리 아이 등록하기
              <span aria-hidden>→</span>
            </Link>
          </div>
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
      <div className="pt-3">
        <ChildrenCarousel children={children} onActiveChange={setActiveChildIdx} />
      </div>
    </>
  );
}
