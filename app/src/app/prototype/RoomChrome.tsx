'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import ChildSwitcher from './ChildSwitcher';
import {
  BabyFoodIcon,
  BreastIcon,
  DecorateIcon,
  DiaperIcon,
  FormulaIcon,
  GemIcon,
  PumpedIcon,
  PumpingIcon,
  SettingsIcon,
  SleepIcon,
  TabGrowthIcon,
  TabPatternIcon,
  TabRecordIcon,
  TabRoomIcon,
  TabWeeksIcon,
} from './icons';

/**
 * 아기방 화면의 UI 껍데기.
 *
 * 방은 캔버스가 그리고, 그 위에 얹히는 카드·버튼·탭바는 전부 DOM 이다.
 * 캔버스에 같이 그리면 한글을 픽셀로 찍어야 하고 스크린리더가 아무것도 못 읽는다.
 */

export type ActionId =
  | 'formula'
  | 'breast'
  | 'pumped'
  | 'pumping'
  | 'babyfood'
  | 'sleep'
  | 'diaper'
  | 'settings'
  | 'bath'
  | 'temperature'
  | 'medication'
  | 'water'
  | 'milk'
  | 'snack'
  | 'play'
  | 'hospital'
  | 'etc';

type Action = {
  id: ActionId;
  label: string;
  icon: ReactNode;
  /** 디자인의 버튼 배경색과 테두리색 */
  bg: string;
  border: string;
};

/**
 * 고를 수 있는 기록 버튼 수.
 * 자리는 좌 4 + 우 4 인데, 오른쪽 맨 아래는 설정이 고정으로 차지한다.
 */
export const MENU_SLOTS = 7;

/** 한 줄(왼쪽·오른쪽 각각)에 들어가는 버튼 수. */
const COLUMN_ROWS = 4;

/** 앱 기존 기록 아이콘. 디자인에 이모지가 없는 종류는 이걸 쓴다. */
function RecordIcon({ file }: { file: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/${file}`} alt="" width={32} height={32} className="block shrink-0" />;
}

/** 고를 수 있는 기록 메뉴 전부. 앞의 일곱 개가 기본값이다. */
export const MENU_OPTIONS: Action[] = [
  { id: 'formula', label: '분유수유', icon: <FormulaIcon />, bg: '#FFF7F8', border: '#FF5675' },
  { id: 'breast', label: '모유수유', icon: <BreastIcon />, bg: '#FFF8F7', border: '#FF7C5A' },
  { id: 'pumped', label: '유축수유', icon: <PumpedIcon />, bg: '#FFFCF6', border: '#FFC951' },
  { id: 'pumping', label: '유축', icon: <PumpingIcon />, bg: '#F8FCF9', border: '#6CC68A' },
  { id: 'babyfood', label: '이유식', icon: <BabyFoodIcon />, bg: '#F8FAFE', border: '#6A92EA' },
  { id: 'sleep', label: '수면', icon: <SleepIcon />, bg: '#FBF8FE', border: '#B67CF0' },
  { id: 'diaper', label: '기저귀', icon: <DiaperIcon />, bg: '#FBF9F9', border: '#A8837F' },
  { id: 'bath', label: '목욕', icon: <RecordIcon file="icon-record-bath.svg" />, bg: '#F6FBFE', border: '#63B6E0' },
  { id: 'temperature', label: '체온', icon: <RecordIcon file="icon-record-temperature.svg" />, bg: '#FFF8F8', border: '#E86A6A' },
  { id: 'medication', label: '투약', icon: <RecordIcon file="icon-record-medication.svg" />, bg: '#FAF8FE', border: '#9B7CE0' },
  { id: 'water', label: '물', icon: <RecordIcon file="icon-record-water.svg" />, bg: '#F6FCFE', border: '#59BFD6' },
  { id: 'milk', label: '우유', icon: <RecordIcon file="icon-record-milk.svg" />, bg: '#FCFCFC', border: '#A9AEB4' },
  { id: 'snack', label: '간식', icon: <RecordIcon file="icon-record-baby-food.svg" />, bg: '#FFFBF4', border: '#E0A24A' },
  { id: 'play', label: '놀이', icon: <RecordIcon file="icon-record-etc.svg" />, bg: '#F8FCF9', border: '#6CC68A' },
  { id: 'hospital', label: '병원', icon: <RecordIcon file="icon-record-temperature.svg" />, bg: '#F8FAFE', border: '#6A92EA' },
  { id: 'etc', label: '기타', icon: <RecordIcon file="icon-record-etc.svg" />, bg: '#FCFCFC', border: '#BBC0C5' },
];

/** 설정은 고를 수 없고 항상 오른쪽 맨 아래에 있다. */
const SETTINGS_ACTION: Action = {
  id: 'settings',
  label: '설정',
  icon: <SettingsIcon />,
  bg: '#FCFCFC',
  border: '#BBC0C5',
};

const BY_ID = new Map(MENU_OPTIONS.map((a) => [a.id, a]));

/** 기본 메뉴 구성 — 설정을 뺀 일곱 개. */
export const DEFAULT_MENU: ActionId[] = [
  'formula',
  'breast',
  'pumped',
  'pumping',
  'babyfood',
  'sleep',
  'diaper',
];

export const ACTION_LABEL: Record<ActionId, string> = Object.fromEntries(
  [...MENU_OPTIONS, SETTINGS_ACTION].map((a) => [a.id, a.label]),
) as Record<ActionId, string>;

const TABS = [
  { id: 'room', label: '아기방', icon: <TabRoomIcon /> },
  { id: 'record', label: '기록', icon: <TabRecordIcon />, href: '/growth-record' },
  { id: 'pattern', label: '패턴', icon: <TabPatternIcon />, href: '/growth-pattern' },
  { id: 'growth', label: '성장', icon: <TabGrowthIcon />, href: '/physical-growth' },
  { id: 'weeks', label: '원더윅스', icon: <TabWeeksIcon />, href: '/wonder-weeks' },
];

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  /** 상단 아이 카드에 넘길 값 — 쌍둥이 묶음과 고를 수 있는 목록 */
  kids: Pick<ComponentProps<typeof ChildSwitcher>, 'current' | 'groups' | 'ageParts' | 'onSelect'>;
  gems: number;
  /** 마지막 기록으로부터 지난 시간. 값이 없으면 '기록 없음'. */
  stats: { label: string; value: string }[];
  /**
   * 좌우에 놓인 기록 버튼. 설정은 빼고 넘긴다.
   * 아래에서부터 왼쪽 → 오른쪽(설정 위) → 왼쪽 → 오른쪽 순으로 쌓인다.
   */
  menu: ActionId[];
  onAction: (id: ActionId) => void;
  onDecorate: () => void;
  onOpenGems: () => void;
}

export default function RoomChrome({
  kids,
  gems,
  stats,
  menu,
  onAction,
  onDecorate,
  onOpenGems,
}: Props) {
  const chosen = menu
    .map((id) => BY_ID.get(id))
    .filter((a): a is Action => !!a)
    .slice(0, MENU_SLOTS);
  // 아래에서부터 채운 뒤 위→아래 순서로 뒤집는다. 빈 자리는 null 로 남겨
  // 개수가 적어도 두 줄의 바닥이 설정 버튼 높이에 맞춰진다.
  const left: (Action | null)[] = Array(COLUMN_ROWS).fill(null);
  const right: (Action | null)[] = Array(COLUMN_ROWS).fill(null);
  right[COLUMN_ROWS - 1] = SETTINGS_ACTION;
  chosen.forEach((a, i) => {
    const row = Math.floor(i / 2);
    if (i % 2 === 0) left[COLUMN_ROWS - 1 - row] = a;
    else right[COLUMN_ROWS - 2 - row] = a;
  });
  return (
    <div
      className="absolute inset-0 pointer-events-none"
    >
      {/* 상단 — 아이 정보, 꾸미기, 오늘 상태 */}
      <div
        className="absolute left-[20px] right-[20px] flex flex-col gap-[10px] pointer-events-auto"
        style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
      >
        <div className="flex gap-[10px] items-center">
          <ChildSwitcher {...kids} />
          <button
            type="button"
            onClick={onDecorate}
            aria-label="방 꾸미기"
            className={`${BOX} size-[50px] flex items-center justify-center shrink-0 active:translate-y-px`}
          >
            <DecorateIcon />
          </button>
        </div>

        <div className="flex gap-[10px] items-center text-[12px] leading-[1.4] text-center">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`${BOX} flex-1 min-w-0 h-[50px] flex flex-col items-center justify-center`}
            >
              <span className="text-[#808991]">{s.label}</span>
              <span className="text-[#121212] truncate px-1">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 재화 — 누르면 보석함으로 */}
      <button
        type="button"
        onClick={onOpenGems}
        aria-label={`보석 ${gems}개, 보석함 열기`}
        className="absolute left-1/2 -translate-x-1/2 flex gap-[4px] items-center justify-center pointer-events-auto"
        style={{ top: 'calc(var(--safe-area-top) + 140px)' }}
      >
        <GemIcon size={20} />
        <span className="text-[#121212] text-[12px] leading-[1.4] tabular-nums">{gems}</span>
      </button>

      {/* 좌우 기록 버튼 */}
      <ActionColumn side="left" actions={left} onAction={onAction} />
      <ActionColumn side="right" actions={right} onAction={onAction} />

      {/* 하단 탭바 — 아기방은 지금 화면, 나머지는 기존 페이지로 보낸다 */}
      <nav
        className={`${BOX} absolute left-1/2 -translate-x-1/2 h-[60px] w-[350px] flex overflow-hidden shadow-[0px_0px_20px_0px_rgba(0,0,0,0.04)] pointer-events-auto`}
        style={{ bottom: 'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 10px)' }}
        aria-label="주요 메뉴"
      >
        {TABS.map((t, i) => {
          const className =
            'flex-1 min-w-0 h-full flex flex-col gap-[4px] items-center justify-center border-[#121212]';
          const style = {
            // 지금 보고 있는 화면을 노란 배경으로 표시한다
            background: t.href ? '#FDFDFE' : 'rgba(255,210,0,0.1)',
            borderLeftWidth: i === 0 ? 0 : 1,
          };
          const body = (
            <>
              {t.icon}
              <span className="text-[#121212] text-[10px] leading-none">{t.label}</span>
            </>
          );
          return t.href ? (
            <Link key={t.id} href={t.href} className={className} style={style}>
              {body}
            </Link>
          ) : (
            <div key={t.id} className={className} style={style} aria-current="page">
              {body}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function ActionColumn({
  side,
  actions,
  onAction,
}: {
  side: 'left' | 'right';
  actions: (Action | null)[];
  onAction: (id: ActionId) => void;
}) {
  return (
    <div
      className="absolute w-[60px] flex flex-col gap-[20px] items-start pointer-events-auto"
      style={{
        [side]: 20,
        top: 'calc(var(--safe-area-top) + 254px)',
      }}
    >
      {actions.map((a, i) =>
        a ? (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a.id)}
            className="w-full flex flex-col gap-[4px] items-center justify-center active:translate-y-px"
          >
            <span
              className="size-[50px] flex items-center justify-center rounded-[4px] border"
              style={{ background: a.bg, borderColor: a.border }}
            >
              {a.icon}
            </span>
            <span className="text-[#121212] text-[14px] leading-[1.4] text-center w-full">
              {a.label}
            </span>
          </button>
        ) : (
          // 빈 자리 — 버튼과 같은 높이(50 + 4 + 글자 한 줄)를 차지해 줄 맞춤을 지킨다
          <div key={`empty-${i}`} aria-hidden className="w-full h-[73.6px]" />
        ),
      )}
    </div>
  );
}
