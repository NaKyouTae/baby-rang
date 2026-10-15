'use client';

import Link from 'next/link';
import {
  TabGrowthIcon,
  TabPatternIcon,
  TabRecordIcon,
  TabRoomIcon,
  TabWeeksIcon,
} from './icons';

export type TabId = 'room' | 'record' | 'pattern' | 'growth' | 'weeks';

const TABS: { id: TabId; label: string; icon: React.ReactNode; href: string }[] = [
  { id: 'room', label: '아기방', icon: <TabRoomIcon />, href: '/home' },
  { id: 'record', label: '기록', icon: <TabRecordIcon />, href: '/growth-record' },
  { id: 'pattern', label: '패턴', icon: <TabPatternIcon />, href: '/growth-pattern' },
  { id: 'growth', label: '성장', icon: <TabGrowthIcon />, href: '/physical-growth' },
  { id: 'weeks', label: '원더윅스', icon: <TabWeeksIcon />, href: '/wonder-weeks' },
];

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/** 탭바가 차지하는 높이(60). 흐름 안에 자리를 잡아야 하는 화면은 이만큼 비운다. */
export const TAB_BAR_HEIGHT = 60;

/**
 * 픽셀 화면 공통 하단 탭바 — 아기방·기록·패턴·성장·원더윅스가 모두 이것 하나를 쓴다.
 * 자리·크기를 쓰는 쪽에 맡기면 화면마다 너비가 달라져서, 위치까지 여기서 정한다:
 * 앱 화면 아래 광고 위 10px, 좌우 20px 여백, 높이 60.
 * 지금 화면은 노란 배경으로 표시하고 링크를 걸지 않는다.
 * 픽셀 폰트를 안 쓰는 화면도 있어 폰트 링크와 글꼴을 탭바에 직접 건다.
 * 내용이 가리지 않게 쓰는 쪽에서 아래를 비울 것(흐름 안이면 TAB_BAR_HEIGHT 만큼).
 */
export default function PixelTabBar({ active }: { active: TabId }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-[20px] pointer-events-none"
      style={{
        bottom: 'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 10px)',
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
      }}
    >
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <nav
        className={`${BOX} h-[60px] w-full flex overflow-hidden pointer-events-auto shadow-[0px_0px_20px_0px_rgba(0,0,0,0.04)]`}
      aria-label="주요 메뉴"
    >
      {TABS.map((t, i) => {
        const on = t.id === active;
        // 칸 사이 구분선은 border-l 클래스로 — 손그림 테두리(globals.css)가 이 클래스를 보고 물결 선으로 그린다
        const cls = `flex-1 min-w-0 h-full flex flex-col gap-[4px] items-center justify-center border-[#121212] ${
          i === 0 ? '' : 'border-l'
        }`;
        const tabStyle = {
          background: on ? 'rgba(255,210,0,0.1)' : '#FDFDFE',
        };
        const body = (
          <>
            {t.icon}
            <span className="text-[#121212] text-[10px] leading-none">{t.label}</span>
          </>
        );
        return on ? (
          <div key={t.id} className={cls} style={tabStyle} aria-current="page">
            {body}
          </div>
        ) : (
          <Link key={t.id} href={t.href} className={cls} style={tabStyle}>
            {body}
          </Link>
        );
      })}
      </nav>
    </div>
  );
}

