'use client';

import type { ComponentProps, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ChildSwitcher from './ChildSwitcher';
import PixelTabBar from './PixelTabBar';
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

/** 고를 수 있는 기록 메뉴 전부. 앞의 일곱 개가 기본 구성이다(배치 순서는 DEFAULT_MENU). */
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

/**
 * 버튼이 들어가는 자리 순서. 아래 줄부터 위로, 한 줄 안에서는 왼쪽 → 오른쪽으로 채운다.
 * 맨 아래 줄 오른쪽은 설정 자리라 왼쪽만 쓴다. 그래서 두 개를 고르면 둘 다 왼쪽에 쌓인다.
 * [줄, 쪽] — 줄은 위에서부터 0~3.
 */
const SLOT_ORDER: [number, 'left' | 'right'][] = [
  [3, 'left'],
  [2, 'left'],
  [2, 'right'],
  [1, 'left'],
  [1, 'right'],
  [0, 'left'],
  [0, 'right'],
];

/**
 * 기본 메뉴 구성 — 설정을 뺀 일곱 개. SLOT_ORDER 순으로 들어가므로
 * 화면에서는 이렇게 보인다.
 *   분유수유 | 이유식
 *   모유수유 | 수면
 *   유축수유 | 기저귀
 *   유축     | 설정
 */
export const DEFAULT_MENU: ActionId[] = [
  'pumping',
  'pumped',
  'diaper',
  'breast',
  'sleep',
  'formula',
  'babyfood',
];

/**
 * 예전 기본 구성들. 고르지 않아도 화면에 뜬 구성이 그대로 저장돼 있어서,
 * 이 값이면 사용자가 바꾼 게 아니라고 보고 새 기본값으로 바꿔 준다.
 * 두 번째 것은 채우는 순서가 왼쪽·오른쪽 번갈아였던 때의 기본값이다.
 */
export const LEGACY_DEFAULT_MENUS: ActionId[][] = [
  ['formula', 'breast', 'pumped', 'pumping', 'babyfood', 'sleep', 'diaper'],
  ['pumping', 'diaper', 'pumped', 'sleep', 'breast', 'babyfood', 'formula'],
];

export const ACTION_LABEL: Record<ActionId, string> = Object.fromEntries(
  [...MENU_OPTIONS, SETTINGS_ACTION].map((a) => [a.id, a.label]),
) as Record<ActionId, string>;


/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  /** 상단 아이 카드에 넘길 값 — 쌍둥이 묶음과 고를 수 있는 목록 */
  kids: Pick<ComponentProps<typeof ChildSwitcher>, 'current' | 'groups' | 'ageParts' | 'onSelect' | 'onTap'>;
  gems: number;
  /** 마지막 기록으로부터 지난 시간. 값이 없으면 '기록 없음'. */
  stats: { label: string; value: string }[];
  /**
   * 좌우에 놓인 기록 버튼. 설정은 빼고 넘긴다.
   * 아래 줄부터 왼쪽 → 오른쪽 순으로 쌓인다(SLOT_ORDER). 맨 아래 줄 오른쪽은 설정이다.
   */
  menu: ActionId[];
  onAction: (id: ActionId) => void;
  onDecorate: () => void;
  onView: () => void;
  onOpenGems: () => void;
  /** 보석과 MODE 사이에 잠깐 띄우는 안내. id 가 바뀌면 같은 문구라도 다시 띄운다. */
  toast?: { id: number; text: string } | null;
  /**
   * 하단 탭바를 그릴지. 탭바는 화면에 고정(fixed)으로 떠서 홈 위에 덮이는 화면
   * (마이페이지·보석함)보다 위에 보이므로, 그 화면이 열려 있으면 숨긴다.
   */
  showTabBar?: boolean;
}

export default function RoomChrome({
  kids,
  gems,
  stats,
  menu,
  onAction,
  onDecorate,
  onView,
  onOpenGems,
  toast = null,
  showTabBar = true,
}: Props) {
  const chosen = menu
    .map((id) => BY_ID.get(id))
    .filter((a): a is Action => !!a)
    .slice(0, MENU_SLOTS);
  // 아래 줄부터 SLOT_ORDER 순으로 채운다. 빈 자리는 null 로 남겨
  // 개수가 적어도 두 줄의 바닥이 설정 버튼 높이에 맞춰진다.
  const left: (Action | null)[] = Array(COLUMN_ROWS).fill(null);
  const right: (Action | null)[] = Array(COLUMN_ROWS).fill(null);
  right[COLUMN_ROWS - 1] = SETTINGS_ACTION;
  chosen.forEach((a, i) => {
    const [row, side] = SLOT_ORDER[i];
    (side === 'left' ? left : right)[row] = a;
  });
  return (
    <div
      className="absolute inset-0 pointer-events-none"
    >
      {/* 상단 — 아이 정보, 보기·꾸미기, 오늘 상태 */}
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

      {/* 재화(왼쪽)와 보기 모드 전환(오른쪽). 누르는 자리를 넉넉히 두려고 위아래로 늘린다. */}
      <div
        className="absolute left-[20px] right-[20px] flex items-center justify-between pointer-events-none"
        style={{ top: 'calc(var(--safe-area-top) + 128px)' }}
      >
        {/* 누르면 보석함으로 */}
        <button
          type="button"
          onClick={onOpenGems}
          aria-label={`보석 ${gems}개, 보석함 열기`}
          className="min-h-[44px] flex gap-[4px] items-center pointer-events-auto"
        >
          <GemIcon size={20} />
          <span className="text-[#121212] text-[12px] leading-[1.4] tabular-nums">{gems}</span>
        </button>
        {/* 카드·버튼을 걷어내고 방만 보는 보기 모드로 */}
        <button
          type="button"
          onClick={onView}
          aria-label="보기 모드로 전환"
          className="min-h-[44px] flex gap-[4px] items-center pointer-events-auto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/mode.svg" alt="" width={20} height={20} className="block shrink-0" />
          <span className="text-[#121212] text-[12px] leading-[1.4]">MODE</span>
        </button>
        {/* 기록 저장 안내 — 보석과 MODE 사이 가운데, 아이콘과 같은 높이 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`${BOX} h-[20px] px-[8px] flex items-center text-[#121212] text-[12px] leading-[1.4] whitespace-nowrap`}
              >
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 좌우 기록 버튼 */}
      <ActionColumn side="left" actions={left} onAction={onAction} />
      <ActionColumn side="right" actions={right} onAction={onAction} />

      {/* 하단 탭바 — 아기방은 지금 화면, 나머지는 기존 페이지로 보낸다 */}
      {showTabBar && <PixelTabBar active="room" />}
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
