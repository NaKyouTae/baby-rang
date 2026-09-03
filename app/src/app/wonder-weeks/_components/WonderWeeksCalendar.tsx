'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';
import { WONDER_WEEKS_LEAPS } from '@/lib/wonderWeeks';

export interface WonderWeeksCalendarHandle {
  scrollToToday: () => void;
}


const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

interface LeapInfo {
  leap: number;
  name: string;
  startWeek: number;
  endWeek: number;
  symptom: string;
  tip: string;
}

function getLeapForDate(date: Date, birthDate: Date): LeapInfo | null {
  const diffMs = date.getTime() - birthDate.getTime();
  const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);

  for (const l of WONDER_WEEKS_LEAPS) {
    if (diffWeeks >= l.startWeek && diffWeeks <= l.endWeek) {
      return { leap: l.leap, name: l.name, startWeek: l.startWeek, endWeek: l.endWeek, symptom: l.symptom, tip: l.tip };
    }
  }
  return null;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface MonthData {
  year: number;
  month: number;
  leapMap: Map<number, LeapInfo>;
  activeLeaps: LeapInfo[];
}

interface Props {
  birthDate: string;
}

const WonderWeeksCalendar = forwardRef<WonderWeeksCalendarHandle, Props>(function WonderWeeksCalendar(
  { birthDate },
  ref,
) {
  const birth = useMemo(
    () => kstYmdToLocalMidnight(toKstYmd(birthDate)),
    [birthDate],
  );
  const todayRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  }));

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);
  // 10단계(79주 ≈ 553일)까지 표시
  const endDate = useMemo(() => addDays(birth, 553), [birth]);
  const today = new Date();

  // 출생월 ~ 끝까지 모든 월 데이터 생성
  const months = useMemo(() => {
    const result: MonthData[] = [];
    let year = birth.getFullYear();
    let month = birth.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const daysInMonth = getDaysInMonth(year, month);
      const leapMap = new Map<number, LeapInfo>();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date < birth) continue;
        const leap = getLeapForDate(date, birth);
        if (leap) leapMap.set(d, leap);
      }

      const leapsMap = new Map<number, LeapInfo>();
      leapMap.forEach((info) => leapsMap.set(info.leap, info));

      result.push({
        year,
        month,
        leapMap,
        activeLeaps: Array.from(leapsMap.values()),
      });

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    return result;
  }, [birth, endDate]);

  return (
    <div>
      {/* 모든 달 연속 표시 */}
      <div className="space-y-4">
        {months.map(({ year, month, leapMap, activeLeaps }) => {
          const daysInMonth = getDaysInMonth(year, month);
          const firstDay = getFirstDayOfMonth(year, month);

          return (
            <div key={`${year}-${month}`}>
              {/* 월 헤더 */}
              <h3 className="text-[14px] font-semibold text-black mb-[10px]">
                {year}년 {month + 1}월
              </h3>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 border-t border-l border-gray-200">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`flex items-center justify-center h-5 text-[12px] font-normal border-r border-b border-gray-200 bg-gray-100 ${
                      i === 0 ? 'text-red-500' : i === 6 ? 'text-[#3078C9]' : 'text-black'
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* 달력 그리드 */}
              <div className="grid grid-cols-7 border-l border-gray-200">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 border-r border-b border-gray-200" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const leapInfo = leapMap.get(day);
                  const isToday = isSameDay(date, today);
                  const isBirthDay = isSameDay(date, birth);
                  const dayOfWeek = (firstDay + i) % 7;

                  return (
                    <div
                      key={day}
                      ref={isToday ? todayRef : undefined}
                      className={`h-8 flex items-center justify-center border-r border-b border-gray-200 ${
                        isToday
                          ? 'bg-[#3078C9]'
                          : isBirthDay
                          ? 'bg-[#FF3B30]/10'
                          : leapInfo
                          ? 'bg-[#3078C9]/10'
                          : ''
                      }`}
                    >
                      <span
                        className={`text-[10px] leading-none ${
                          isToday
                            ? 'text-white font-bold'
                            : dayOfWeek === 0
                            ? 'text-red-400'
                            : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}

                {/* 마지막 행 빈 칸 채우기 */}
                {(() => {
                  const totalCells = firstDay + daysInMonth;
                  const remainder = totalCells % 7;
                  if (remainder === 0) return null;
                  return Array.from({ length: 7 - remainder }).map((_, i) => (
                    <div key={`trail-${i}`} className="h-8 border-r border-b border-gray-200" />
                  ));
                })()}
              </div>

              {/* 해당 월 leap 정보 */}
              {activeLeaps.length > 0 && (
                <div className="mt-4 space-y-3">
                  {activeLeaps.map((info) => (
                    <div
                      key={info.leap}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] font-bold shrink-0">
                          {info.leap}
                        </span>
                        <p className="text-[14px] font-medium text-black flex-1 leading-5">
                          {info.name}
                        </p>
                        <span className="text-[12px] font-normal text-[#3078C9] shrink-0">
                          {info.startWeek}-{info.endWeek}주차
                        </span>
                      </div>

                      <div className="bg-[#515C66]/5 rounded-[4px] p-3 mb-[10px]">
                        <p className="text-[12px] font-semibold text-black mb-2">증상</p>
                        <p className="text-[12px] font-normal text-black">
                          {info.symptom}
                        </p>
                      </div>

                      <div className="bg-[#FFCC00]/5 rounded-[4px] p-3">
                        <p className="text-[12px] font-semibold text-black mb-2">대책</p>
                        <p className="text-[12px] font-normal text-black">
                          {info.tip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default WonderWeeksCalendar;
