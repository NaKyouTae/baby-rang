'use client';

import Link from 'next/link';
import { useChildren, type Child } from '@/hooks/useChildren';

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

function fmt(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function diffDays(a: Date, b: Date) {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((a0 - b0) / MS_PER_DAY);
}

function calcAgeLabel(birthDate: Date, today: Date) {
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0) return `${years}세 ${months}개월`;
  return `${months}개월`;
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

function ChildWonderCard({ child }: { child: Child }) {
  const today = new Date();
  const birth = new Date(child.birthDate + 'T00:00:00');
  const { current, next } = getLeapStatus(birth, today);
  const ageLabel = calcAgeLabel(birth, today);

  return (
    <Link
      href={`/wonder-weeks?childId=${encodeURIComponent(child.id)}`}
      className="block rounded-[8px] overflow-hidden bg-white border border-gray-200 active:opacity-70"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-base shrink-0">
              {child.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={child.profileImage}
                  alt={child.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{child.gender === 'female' ? '👧' : '👦'}</span>
              )}
            </div>
            <span className="text-sm font-bold text-gray-900 truncate">{child.name}</span>
            <span className="text-[10px] text-gray-500 shrink-0">{ageLabel}</span>
          </div>
          {current ? (
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
              원더윅스 진행중
            </span>
          ) : (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
              평온기
            </span>
          )}
        </div>

        {current ? (
          <div className="text-[11px] text-gray-700">
            <span className="font-semibold text-rose-600">Leap {current.leap}. {current.name}</span>
            <span className="text-gray-500"> · {fmt(current.startDate)} ~ {fmt(current.endDate)}</span>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500">현재는 원더윅스가 아니에요</div>
        )}

        {next && (
          <div className="text-[11px] text-gray-500 mt-0.5">
            다음: Leap {next.leap}. {next.name} · {fmt(next.startDate)} ~ {fmt(next.endDate)}
            <span className="ml-1 font-bold text-primary-600">D-{next.dDay}</span>
          </div>
        )}
        {!next && !current && (
          <div className="text-[11px] text-gray-400 mt-0.5">예정된 원더윅스가 없어요</div>
        )}
      </div>
    </Link>
  );
}

export default function WonderWeeksStrip() {
  const { children, isLoaded } = useChildren();

  if (!isLoaded || children.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 mb-2">우리 아이 원더윅스</h2>
      <div className="space-y-2">
        {children.map((child) => (
          <ChildWonderCard key={child.id} child={child} />
        ))}
      </div>
    </section>
  );
}
