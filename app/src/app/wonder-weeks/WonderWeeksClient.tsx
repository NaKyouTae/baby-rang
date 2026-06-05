'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelectedChild } from '@/hooks/useChildren';
import WonderWeeksCalendar, { type WonderWeeksCalendarHandle } from './_components/WonderWeeksCalendar';
import ChildSelector from '@/components/ChildSelector';
import NoChildCard from '@/components/NoChildCard';
import PageHeader from '@/components/PageHeader';

export default function WonderWeeksClient() {
  return (
    <Suspense fallback={null}>
      <WonderWeeksContent />
    </Suspense>
  );
}

function WonderWeeksContent() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('childId');
  const calendarRef = useRef<WonderWeeksCalendarHandle | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // ?childId= 로 들어온 경우 해당 아기를 전역 선택으로 동기화한다.
  useEffect(() => {
    if (!isLoaded || !childIdParam) return;
    const matched = children.find((c) => c.id === childIdParam);
    if (matched && matched.id !== selectedChild?.id) {
      selectChild(matched);
    }
  }, [isLoaded, children, childIdParam, selectedChild, selectChild]);

  if (!isLoaded) return null;

  const noChild = !selectedChild;

  return (
    <div className="flex flex-col bg-white">
      <PageHeader title="원더윅스" variant="back" />
      <div className="flex flex-col px-6 pb-[calc(var(--bottom-nav-space)+80px)]">
        <div ref={topRef} />
        <div className="pt-6 pb-6">
          {noChild ? (
            <NoChildCard loginMessage="로그인하고 우리 아기의 원더윅스를 확인하세요." />
          ) : (
            <ChildSelector
              children={children}
              selected={selectedChild}
              onSelect={selectChild}
            />
          )}
        </div>

        {noChild ? (
          <div className="rounded-[8px] border border-dotted border-gray-200 px-5 py-12 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-empty-record.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden="true"
              />
            </div>
            <p className="mt-[10px] text-[14px] font-medium text-black">
              등록된 아기 정보가 없어요.
            </p>
            <p className="mt-[4px] text-[12px] font-normal text-gray-500">
              아기를 추가하면 원더윅스 정보를 알려드려요.
            </p>
          </div>
        ) : (
          <WonderWeeksCalendar ref={calendarRef} birthDate={selectedChild.birthDate} />
        )}
      </div>

      {/* 하단 버튼들 — 오늘(왼쪽) + 상단 이동(오른쪽) */}
      {!noChild && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 px-6 pointer-events-none"
          style={{ bottom: 'calc(var(--bottom-nav-space) + 24px)' }}
        >
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => calendarRef.current?.scrollToToday()}
              className="pointer-events-auto w-[45px] h-8 flex items-center justify-center rounded-full bg-primary-500 text-white text-[12px] font-medium shadow-[0_0_20px_rgba(0,0,0,0.1)] active:scale-95 transition-transform"
              aria-label="오늘로 이동"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="pointer-events-auto w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] active:scale-95 transition-transform"
              aria-label="맨 위로 이동"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
