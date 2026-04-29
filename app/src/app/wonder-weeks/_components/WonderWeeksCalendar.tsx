'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';

export interface WonderWeeksCalendarHandle {
  scrollToToday: () => void;
}

// 원더윅스 폭풍(fussy) 기간 — 출생일 기준 주차 범위
// 참고: https://brunch.co.kr/@sleepinglion/18
const WONDER_WEEKS_LEAPS = [
  {
    leap: 1, name: '감각의 변화', startWeek: 4, endWeek: 5,
    symptom: '아기 자신이 있는 곳이 엄마의 뱃속이 아니라는 것을 깨닫기 시작해 더 오래 깨어 있고 주변을 살피게 돼요. 또한 반사행동에 의해 온몸을 버둥거리고, 그 움직임에 놀라 울기도 합니다.',
    tip: '엄마의 목소리와 체취만이 아기가 이 낯선 세상에서 친숙하게 느끼는 모든 것이므로 아기를 안아주고 꼭 안아주면 아기가 진정될 수 있어요. 속싸개나 스와들업이 엄마를 그나마 편하게 해 줄 수 있습니다.',
  },
  {
    leap: 2, name: '패턴 생성', startWeek: 7, endWeek: 9,
    symptom: '밤낮 주기 구분이 시작되며 잠드는 것이 더 어려워집니다. 손을 만지작거리며 반복적인 패턴 행동을 보입니다.',
    tip: '규칙적인 낮밤 활동 패턴을 구성하고 수면 의식을 정립해 주세요.',
  },
  {
    leap: 3, name: '자연스러운 움직임', startWeek: 11, endWeek: 13,
    symptom: '고개를 가누고, 딸랑이를 흔들 수 있으며, 수면 및 활동 패턴이 유사해집니다.',
    tip: '신체 발달을 지원하는 놀이 시간을 충분히 제공해 주세요.',
  },
  {
    leap: 4, name: '이벤트', startWeek: 15, endWeek: 19,
    symptom: '주변의 변화를 감지하고 일상으로 여기기 시작합니다. 사물에 대한 호기심이 커집니다.',
    tip: '낯선 사람과 새로운 환경을 접할 기회를 자주 주는 것이 좋아요.',
  },
  {
    leap: 5, name: '관계 형성', startWeek: 23, endWeek: 26,
    symptom: '엄마의 목소리만으로도 존재를 인식합니다. 아랫니가 나면서 잠들기 어려워하고 분리불안이 시작됩니다.',
    tip: '안정적인 양육자와의 상호작용을 늘리고, 분리불안에 차분하게 대응해 주세요.',
  },
  {
    leap: 6, name: '분류 인지', startWeek: 34, endWeek: 37,
    symptom: '기기 시작과 함께 분리불안이 본격화됩니다. 사물, 동물, 사람을 분류할 수 있게 됩니다.',
    tip: '안전한 탐색 환경을 만들어 주고, 분리불안 완화를 위해 짧은 분리 연습을 해보세요.',
  },
  {
    leap: 7, name: '순서 인지', startWeek: 42, endWeek: 46,
    symptom: '순서와 원리를 이해하기 시작합니다. 일정한 수면 의식을 꼭 지켜주어야 하는 시기입니다.',
    tip: '일관된 수면 루틴을 유지하고, 예측 가능한 일과를 구성해 주세요.',
  },
  {
    leap: 8, name: '유아기 시작', startWeek: 51, endWeek: 54,
    symptom: '영아기가 끝나고 유아기가 시작됩니다. 분리불안이 다시 나타날 수 있습니다.',
    tip: '독립성 발달을 지원하면서도 안정감을 함께 제공해 주세요.',
  },
  {
    leap: 9, name: '원칙 인지', startWeek: 60, endWeek: 64,
    symptom: '부모의 행동을 모방하기 시작합니다. 자신의 행동이 결과를 초래한다는 것을 인식합니다.',
    tip: '모범적인 행동을 보여주고, 결과 기반 학습을 활용해 주세요.',
  },
  {
    leap: 10, name: '시스템', startWeek: 75, endWeek: 79,
    symptom: '환경을 적극적으로 탐색하고 문장을 이해하기 시작합니다. 떼를 쓰는 행동이 본격적으로 시작됩니다.',
    tip: '동네 주변으로 산책을 자주 나가고, 다양한 환경을 경험하게 해주세요.',
  },
];

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
      <div className="space-y-10">
        {months.map(({ year, month, leapMap, activeLeaps }) => {
          const daysInMonth = getDaysInMonth(year, month);
          const firstDay = getFirstDayOfMonth(year, month);

          return (
            <div key={`${year}-${month}`}>
              {/* 월 헤더 */}
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {year}년 {month + 1}월
              </h3>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 border-t border-l border-gray-300">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`text-center text-[10px] font-medium py-1 border-r border-b border-gray-300 bg-gray-50 ${
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* 달력 그리드 */}
              <div className="grid grid-cols-7 border-l border-gray-300">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 border-r border-b border-gray-300" />
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
                      className={`h-8 flex flex-col items-center justify-center border-r border-b border-gray-300 ${
                        leapInfo ? 'bg-primary-50' : ''
                      }`}
                    >
                      <span
                        className={`text-[10px] leading-none ${
                          isToday
                            ? 'bg-primary-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold'
                            : isBirthDay
                            ? 'bg-pink-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold'
                            : dayOfWeek === 0
                            ? 'text-red-400'
                            : dayOfWeek === 6
                            ? 'text-blue-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </span>

                      {isBirthDay && (
                        <span className="text-base leading-none">🎂</span>
                      )}
                    </div>
                  );
                })}

                {/* 마지막 행 빈 칸 채우기 */}
                {(() => {
                  const totalCells = firstDay + daysInMonth;
                  const remainder = totalCells % 7;
                  if (remainder === 0) return null;
                  return Array.from({ length: 7 - remainder }).map((_, i) => (
                    <div key={`trail-${i}`} className="h-8 border-r border-b border-gray-300" />
                  ));
                })()}
              </div>

              {/* 해당 월 leap 정보 */}
              {activeLeaps.length > 0 && (
                <div className="mt-4 space-y-3">
                  {activeLeaps.map((info) => (
                    <div
                      key={info.leap}
                      className="bg-white border-2 border-primary-200 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-500 text-white text-xs font-bold shrink-0">
                          {info.leap}
                        </span>
                        <p className="text-base font-bold text-primary-700 flex-1">
                          {info.name}
                        </p>
                        <span className="text-xs text-primary-400 shrink-0">
                          {info.startWeek}~{info.endWeek}주차
                        </span>
                      </div>

                      <div className="bg-primary-50 rounded-xl p-3 mb-2">
                        <p className="text-xs font-bold text-primary-500 mb-1">증상</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {info.symptom}
                        </p>
                      </div>

                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">대책</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
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

      {/* 전체 원더윅스 일정 */}
      <div className="mt-8 bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-gray-800 mb-4">전체 원더윅스 일정</h3>
        <div className="space-y-3">
          {WONDER_WEEKS_LEAPS.map((leap) => {
            const startLeapDate = addDays(birth, Math.round(leap.startWeek * 7));
            const endLeapDate = addDays(birth, Math.round(leap.endWeek * 7));
            if (startLeapDate > endDate) return null;

            const isPast = endLeapDate < today;
            const isCurrent = startLeapDate <= today && endLeapDate >= today;

            return (
              <div
                key={leap.leap}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                  isCurrent
                    ? 'bg-primary-50 border-2 border-primary-200'
                    : isPast
                    ? 'bg-gray-50 opacity-60'
                    : 'bg-gray-50'
                }`}
              >
                <span className="text-xl">{isCurrent ? '😢' : isPast ? '✅' : '⏳'}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isCurrent ? 'text-primary-700' : 'text-gray-700'}`}>
                    Leap {leap.leap}: {leap.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isCurrent ? 'text-primary-400' : 'text-gray-400'}`}>
                    [{leap.startWeek}~{leap.endWeek}주차] {startLeapDate.getMonth() + 1}/{startLeapDate.getDate()} ~ {endLeapDate.getMonth() + 1}/{endLeapDate.getDate()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WonderWeeksCalendar;
