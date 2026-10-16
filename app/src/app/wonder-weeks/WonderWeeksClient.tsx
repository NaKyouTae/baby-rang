'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedChild } from '@/hooks/useChildren';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import { calcChildAge } from '@/lib/childAge';
import { groupTwins } from '@/lib/twins';
import ChildSwitcher from '../home/_components/ChildSwitcher';
import PixelTabBar, { TAB_BAR_HEIGHT } from '../home/_components/PixelTabBar';
import WonderWeeksCalendar from './_components/WonderWeeksCalendar';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/** 헤더(48) + 간격(10) + 아이 카드(48) + 간격(10) — 달력이 처음에 놓이는 자리. */
const TOP_STACK = 116;

/**
 * 원더윅스 — 픽셀 디자인.
 *
 * 화면 높이에 딱 맞춘다. 달력은 화면 전체에서 스크롤하고, 헤더·아이 카드·탭바는 그 위에 떠 있다
 * (디자인의 '원더윅스 화면 뷰'처럼 달력이 상자 사이로 지나간다).
 */
export default function WonderWeeksClient() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();

  // 생일이 같은 아이는 한 카드에 같이 띄운다. 달력도 같으니 따로 볼 이유가 없다.
  const groups = useMemo(() => groupTwins(children), [children]);
  const current = selectedChild
    ? (groups.find((g) => g.some((c) => c.id === selectedChild.id)) ?? [selectedChild])
    : null;
  const toGroup = (g: typeof children) => ({
    key: g[0].id,
    kids: g.map((c) => ({ name: c.name, gender: c.gender })),
  });
  const age = selectedChild ? calcChildAge(selectedChild.birthDate) : null;

  return (
    <div
      className="relative overflow-hidden bg-[#F7F8F9]"
      style={{
        // h-full 은 레이아웃이 높이 없는 div 로 감싸서 풀리지 않는다. 앱 셸 높이를 직접 준다.
        height: 'var(--app-h, 100dvh)',
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <Suspense fallback={null}>
        <ChildIdSync />
      </Suspense>

      {/* 달력 — 화면 전체에서 스크롤한다. 처음엔 헤더·아이 카드 아래, 끝은 탭바 위에서 멈춘다 */}
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain px-[20px]"
        style={{
          paddingTop: `calc(var(--safe-area-top) + 20px + ${TOP_STACK}px)`,
          // 광고 + 탭바(60) + 아래 여백(10) + 간격(10) 만큼 비워야 마지막 상자가 가리지 않는다.
          paddingBottom: `calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + ${TAB_BAR_HEIGHT + 20}px)`,
        }}
      >
        {selectedChild && <WonderWeeksCalendar birthDate={selectedChild.birthDate} />}
      </div>

      {/* 헤더 — 달력 위에 떠 있다 */}
      <header
        className={`${BOX} absolute left-[20px] right-[20px] z-10 h-[48px] flex items-center justify-center px-[10px]`}
        style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
      >
        <h1 className="text-[#121212] text-[16px] leading-none font-normal">원더윅스</h1>
      </header>

      {/* 아이 카드 — 불러오는 동안은 같은 높이의 빈 상자로 자리만 잡아 화면이 튀지 않게 한다 */}
      <div
        className="absolute left-[20px] right-[20px] z-20 flex"
        style={{ top: 'calc(var(--safe-area-top) + 78px)' }}
      >
        {current && age ? (
          <ChildSwitcher
            current={toGroup(current)}
            groups={groups.map(toGroup)}
            ageParts={[`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`]}
            onSelect={(key) => {
              const next = children.find((c) => c.id === key);
              if (next) selectChild(next);
            }}
          />
        ) : isLoaded ? (
          <NoChildBox />
        ) : (
          <div className={`${BOX} flex-1 h-[48px]`} />
        )}
      </div>

      {/* 탭바는 화면 아래에 떠 있다 */}
      <PixelTabBar active="weeks" />
    </div>
  );
}

/** ?childId= 로 들어오면 그 아이를 전역 선택으로 맞춘다. 주소를 읽어서 Suspense 안에 따로 둔다. */
function ChildIdSync() {
  const { children, isLoaded, selectedChild, selectChild } = useSelectedChild();
  const childIdParam = useSearchParams().get('childId');
  useEffect(() => {
    if (!isLoaded || !childIdParam) return;
    const matched = children.find((c) => c.id === childIdParam);
    if (matched && matched.id !== selectedChild?.id) selectChild(matched);
  }, [isLoaded, children, childIdParam, selectedChild, selectChild]);
  return null;
}

/** 아이가 없을 때 아이 카드 자리. 비로그인은 로그인 안내, 로그인 회원은 마이페이지(아이 등록)로 보낸다. */
function NoChildBox() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();
  return (
    <button
      type="button"
      onClick={() =>
        isAuthenticated
          ? router.push('/home?my=1')
          : openLoginPrompt('로그인하고 우리 아기의 원더윅스를 확인하세요.')
      }
      className={`${BOX} flex-1 min-w-0 h-[48px] flex flex-col items-start justify-center px-[10px] text-left leading-[1.4]`}
    >
      <span className="text-[#121212] text-[16px]">등록된 아기가 없어요</span>
      <span className="text-[#808991] text-[14px]">아기를 추가하면 원더윅스를 알려드려요</span>
    </button>
  );
}
