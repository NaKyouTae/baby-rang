'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import {
  BabyFoodIcon,
  BreastIcon,
  DiaperIcon,
  FormulaIcon,
  PumpedIcon,
  PumpingIcon,
  SleepIcon,
} from '../home/_components/icons';
import type { GrowthType } from './types';

/** 픽셀 화면 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
export const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/** 픽셀 화면 글꼴. 폰트 파일은 PIXEL_FONT_HREF 를 link 로 건다. */
export const PIXEL_FONT = 'Galmuri11Fig, Galmuri11, monospace';
export const PIXEL_FONT_HREF = 'https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css';

/** 기록 종류 아이콘 — 홈 기록 버튼과 같은 이모지. 없는 종류는 기존 기록 아이콘(RECORD_ICONS)을 쓴다. */
export const RECORD_EMOJI: Partial<Record<GrowthType, React.ReactNode>> = {
  FORMULA: <FormulaIcon />,
  BREASTFEEDING: <BreastIcon />,
  PUMPED_FEEDING: <PumpedIcon />,
  PUMPING: <PumpingIcon />,
  BABY_FOOD: <BabyFoodIcon />,
  SLEEP: <SleepIcon />,
  DIAPER: <DiaperIcon />,
};

/** 아기가 없을 때 아이 카드 자리 — 로그인했으면 아기 등록(마이페이지), 아니면 로그인 안내. */
export function NoChildBox({ sub, loginMessage }: { sub: string; loginMessage: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();
  return (
    <button
      type="button"
      onClick={() => (isAuthenticated ? router.push('/home?my=1') : openLoginPrompt(loginMessage))}
      className={`${BOX} flex-1 min-w-0 h-[50px] flex flex-col items-start justify-center px-[10px] text-left leading-[1.4]`}
    >
      <span className="text-[#121212] text-[16px]">등록된 아기가 없어요</span>
      <span className="text-[#808991] text-[14px]">{sub}</span>
    </button>
  );
}
