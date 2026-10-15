'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';
import { WONDER_WEEKS_LEAPS, type WonderWeekLeap } from '@/lib/wonderWeeks';

export interface WonderWeeksCalendarHandle {
  scrollToToday: () => void;
}

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 요일 글자색 — 일요일 빨강, 토요일 파랑. */
const weekdayColor = (dow: number) =>
  dow === 0 ? 'text-[#FF4040]' : dow === 6 ? 'text-[#0078F0]' : 'text-[#121212]';

/**
 * 칸 배경. 같은 날이 겹치면 오늘 > 생일 > 도약기 순으로 이긴다.
 * 오늘이 도약기 한가운데여도 '지금 여기'가 먼저 보여야 한다.
 */
const MARK_BG = { today: 'bg-[#FFD200]', birth: 'bg-[#FF4040]', leap: 'bg-[#3078C9]' } as const;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getLeapForDate(date: Date, birthDate: Date): WonderWeekLeap | null {
  const diffWeeks = (date.getTime() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
  return WONDER_WEEKS_LEAPS.find((l) => diffWeeks >= l.startWeek && diffWeeks <= l.endWeek) ?? null;
}

interface MonthData {
  year: number;
  month: number;
  leapDays: Set<number>;
  /** 이 달에서 처음 시작하는 도약기. 달을 걸치는 도약기 설명이 두 번 나오지 않게 한다. */
  newLeaps: WonderWeekLeap[];
}

interface Props {
  birthDate: string;
}

/**
 * 출생월부터 10단계가 끝나는 달까지 달력을 한 장씩 쌓는다.
 * 도약기가 시작된 달 바로 아래에 그 도약기 설명 카드를 붙인다.
 */
const WonderWeeksCalendar = forwardRef<WonderWeeksCalendarHandle, Props>(function WonderWeeksCalendar(
  { birthDate },
  ref,
) {
  const birth = useMemo(() => kstYmdToLocalMidnight(toKstYmd(birthDate)), [birthDate]);
  const todayRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  }));

  // 들어오자마자 오늘이 있는 달을 보여준다. 페이지 안쪽 스크롤 영역만 움직인다.
  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center' });
  }, [birth]);

  // 10단계(79주 ≈ 553일)까지 표시
  const months = useMemo(() => {
    const endDate = addDays(birth, 553);
    const seen = new Set<number>();
    const result: MonthData[] = [];
    let year = birth.getFullYear();
    let month = birth.getMonth();

    while (year < endDate.getFullYear() || (year === endDate.getFullYear() && month <= endDate.getMonth())) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const leapDays = new Set<number>();
      const newLeaps: WonderWeekLeap[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date < birth) continue;
        const leap = getLeapForDate(date, birth);
        if (!leap) continue;
        leapDays.add(d);
        if (!seen.has(leap.leap)) {
          seen.add(leap.leap);
          newLeaps.push(leap);
        }
      }
      result.push({ year, month, leapDays, newLeaps });

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    return result;
  }, [birth]);

  const today = new Date();

  return (
    <div className="flex flex-col gap-[10px]">
      {months.map(({ year, month, leapDays, newLeaps }) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        // 앞뒤 빈칸까지 채워 7칸씩 끊는다
        const cells: (number | null)[] = [
          ...Array.from({ length: firstDay }, () => null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        while (cells.length % 7) cells.push(null);
        const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

        return (
          <div key={`${year}-${month}`} className="flex flex-col gap-[10px]">
            <section className={`${BOX} flex flex-col gap-[10px] p-[10px]`}>
              <h3 className="text-[#121212] text-[14px] leading-[1.4] font-normal">
                {year}년 {month + 1}월
              </h3>
              <div className="flex flex-col gap-[10px] text-[14px] leading-[1.4] text-center">
                <div className="flex">
                  {DAY_LABELS.map((label, i) => (
                    <span key={label} className={`flex-1 min-w-0 ${weekdayColor(i)}`}>
                      {label}
                    </span>
                  ))}
                </div>
                {weeks.map((week, w) => (
                  <div key={w} className="flex">
                    {week.map((day, i) => {
                      if (day === null) return <span key={i} className="flex-1 min-w-0" />;
                      const date = new Date(year, month, day);
                      const isToday = isSameDay(date, today);
                      const mark = isToday
                        ? 'today'
                        : isSameDay(date, birth)
                          ? 'birth'
                          : leapDays.has(day)
                            ? 'leap'
                            : null;
                      return (
                        <div
                          key={i}
                          ref={isToday ? todayRef : undefined}
                          aria-current={isToday ? 'date' : undefined}
                          className={`flex-1 min-w-0 ${
                            mark ? `${MARK_BG[mark]} text-[#FDFDFE]` : weekdayColor(i)
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            {newLeaps.map((info) => (
              <LeapCard key={info.leap} info={info} />
            ))}
          </div>
        );
      })}
    </div>
  );
});

function LeapCard({ info }: { info: WonderWeekLeap }) {
  return (
    <section className={`${BOX} flex flex-col gap-[10px] p-[10px] text-[#121212] text-[14px] leading-[1.4]`}>
      <div className="flex items-start justify-between gap-[8px]">
        <h3 className="min-w-0 font-normal">
          원더윅스 CH {info.leap}. {info.name}
        </h3>
        <span className="shrink-0 text-[#3078C9]">
          {info.startWeek}-{info.endWeek}주차
        </span>
      </div>

      <div className="flex flex-col gap-[4px] p-[10px] rounded-[4px] bg-[#F7F8F9]">
        <p>[ 증상 ]</p>
        <p>{info.symptom}</p>
      </div>

      <div className="flex flex-col gap-[4px] p-[10px] rounded-[4px] bg-[rgba(255,210,0,0.1)]">
        <p>[ 대응 ]</p>
        <p>{info.tip}</p>
      </div>

      {(info.play || info.toy) && (
        <div className="flex flex-col gap-[4px] p-[10px] rounded-[4px] border border-[#808991]">
          <p>[ 추천 놀이 / 장난감 ]</p>
          {info.play && <p>{info.play}</p>}
          {info.toy && (
            <a
              href={info.toy.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex gap-[8px] items-center"
            >
              <span className="shrink-0 flex items-center justify-center p-[8px] border border-[#EEF0F1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.toy.imageUrl} alt="" width={54} height={40} className="block w-[54px] h-[40px] object-cover" />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-[4px]">
                <span className="text-[12px] leading-[18px]">{info.toy.name}</span>
                <span className="text-[#3078C9] text-[10px] leading-none underline">자세히 보기</span>
              </span>
            </a>
          )}
        </div>
      )}
    </section>
  );
}

export default WonderWeeksCalendar;
