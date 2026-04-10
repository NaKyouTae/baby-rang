'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChildren, type Child } from '@/hooks/useChildren';
import { calcChildAge, toKstYmd } from '@/lib/childAge';
import WonderWeeksCalendar, { type WonderWeeksCalendarHandle } from './_components/WonderWeeksCalendar';
import ChildSelector from '@/components/ChildSelector';
import ChildPickScreen from '@/components/ChildPickScreen';
import EmptyChildState from '@/components/EmptyChildState';

export default function WonderWeeksPage() {
  return (
    <Suspense fallback={null}>
      <WonderWeeksContent />
    </Suspense>
  );
}

function WonderWeeksContent() {
  const { children, isLoaded } = useChildren();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('childId');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const calendarRef = useRef<WonderWeeksCalendarHandle | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // 첫 진입 시 ?childId= 가 있으면 해당 아이 자동 선택, 아이가 1명이면 자동 선택,
  // 그 외에는 아이 선택 화면을 먼저 보여준다.
  useEffect(() => {
    if (!isLoaded || children.length === 0 || selectedChild) return;
    if (childIdParam) {
      const matched = children.find((c) => c.id === childIdParam);
      if (matched) {
        setSelectedChild(matched);
        return;
      }
    }
    if (children.length === 1) {
      setSelectedChild(children[0]);
    }
  }, [isLoaded, children, selectedChild, childIdParam]);

  if (!isLoaded) return null;

  // 등록된 아이가 없으면 등록 유도
  if (children.length === 0) {
    return (
      <EmptyChildState
        emoji="👶"
        title="우리 아이 원더 윅스"
        description={
          <>
            아이를 등록하면<br />
            원더윅스를 확인할 수 있어요.
          </>
        }
      />
    );
  }

  if (!selectedChild) {
    return (
      <ChildPickScreen
        emoji="👶"
        title="우리 아이 원더 윅스"
        description={<>원더윅스를 확인할 아이를 선택해주세요.</>}
        children={children}
        onSelect={setSelectedChild}
      />
    );
  }

  const { days, months, extraDays } = calcChildAge(selectedChild.birthDate);
  const ageLabel = months > 0 ? `${months}개월 ${extraDays}일` : `${days}일`;
  const birthYmd = toKstYmd(selectedChild.birthDate);

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div ref={topRef} />
      {/* 스티키 타이틀 바 */}
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-3">
        <ChildSelector
          children={children}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* 아이 프로필 */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl bg-white border border-primary-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary-400 to-primary-300" />
              <div className="relative w-12 h-12 rounded-full bg-white overflow-hidden flex items-center justify-center text-2xl ring-2 ring-white leading-none">
                {selectedChild.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedChild.profileImage}
                    alt={selectedChild.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full leading-[1]">{selectedChild.gender === 'female' ? '👧' : '👦'}</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[17px] font-extrabold text-gray-900 truncate leading-tight">
                  {selectedChild.name}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full font-bold ${
                    selectedChild.gender === 'female'
                      ? 'bg-pink-100 text-pink-600'
                      : 'bg-sky-100 text-sky-600'
                  }`}
                  style={{ fontSize: '11px', lineHeight: 1, paddingBottom: '1.5px' }}
                >
                  {selectedChild.gender === 'female' ? '♀' : '♂'}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">{birthYmd}</span>
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
      </div>

      <div className="px-4">
        <WonderWeeksCalendar ref={calendarRef} birthDate={selectedChild.birthDate} />
      </div>

      {/* 하단 버튼들 — 오늘(왼쪽) + 상단 이동(오른쪽) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-4 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
      >
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => calendarRef.current?.scrollToToday()}
            className="pointer-events-auto px-4 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
            aria-label="오늘로 이동"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="pointer-events-auto w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="맨 위로 이동"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
