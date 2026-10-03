'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { calcChildAge } from '@/lib/childAge';
import { useSelectedChild } from '@/hooks/useChildren';
import PixelScreen from './PixelScreen';
import DecorateSheet, { type RoomItem } from './DecorateSheet';
import { preloadSprites, type Placement } from './placements';
import { ROOM_W_TILES, WALL_TILES } from './tiles';
import { POSE_LABEL, poseForMonths } from './pixelSprite';
import type { ActionId } from './scene';

/** 로그인/아이 등록 전에도 화면을 볼 수 있게 두는 미리보기용 아이. */
const DEMO = { name: '아기', birthDate: demoBirthDate(14) };

function demoBirthDate(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

/** 배치를 임시로 담아두는 브라우저 저장소 키. 서버 저장이 생기면 사라진다. */
const STORAGE_KEY = 'babyrang.prototype.placements';

/**
 * 저장해 둔 배치를 읽는다.
 * 첫 렌더에서 바로 쓰려고 effect 가 아니라 useState 초기값으로 넣는다 —
 * effect 에서 setState 하면 빈 방이 한 번 그려졌다가 덮인다.
 */
function loadSavedPlacements(): Placement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Placement[]) : [];
  } catch {
    // 저장값이 깨졌으면 빈 방으로 시작한다
    return [];
  }
}

const ACTION_LABEL: Record<ActionId, string> = {
  feeding: '수유',
  sleep: '수면',
  diaper: '기저귀',
  growth: '키·몸무게',
  wonder: '원더윅스',
  test: '기질검사',
};

export default function PrototypeClient() {
  const { selectedChild } = useSelectedChild();
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(loadSavedPlacements);

  const child = selectedChild ?? DEMO;
  const isDemo = !selectedChild;
  const age = useMemo(() => calcChildAge(child.birthDate), [child.birthDate]);
  const pose = poseForMonths(age.months);

  // 기록 API 에 아직 안 물렸다. 실제 아이가 선택되면 숫자를 지어내지 않고 비워 둔다.
  const stats = useMemo(
    () => [
      { label: '수유', value: isDemo ? '5회' : '-' },
      { label: '잠', value: isDemo ? '11시간' : '-' },
      { label: '기저귀', value: isDemo ? '7회' : '-' },
    ],
    [isDemo],
  );

  // 배치 저장 API 가 아직 없다. 새로고침에 날아가지 않도록 임시로 브라우저에 둔다.
  // Room/RoomPlacement 테이블이 생기면 이 자리를 서버 호출로 바꾼다.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    } catch {
      /* 용량 초과 등은 무시한다 — 다음 저장에서 다시 시도된다 */
    }
  }, [placements]);

  useEffect(() => {
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  const handleAction = useCallback((id: ActionId) => setOpenAction(id), []);
  const handlePet = useCallback(() => {}, []);
  const handleDecorate = useCallback(() => setDecorating(true), []);

  // 고른 가구를 방 가운데에 놓는다. 그다음 끌어서 옮기면 된다.
  const handlePick = useCallback((item: RoomItem) => {
    setDecorating(false);
    preloadSprites([item.imageUrl]);
    setPlacements((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        spriteKey: item.spriteKey,
        imageUrl: item.imageUrl,
        tileX: Math.max(0, Math.round((ROOM_W_TILES - item.tileW) / 2)),
        tileY: WALL_TILES + 4,
        tileW: item.tileW,
        tileH: item.tileH,
        spriteLiftY: item.spriteLiftY,
      },
    ]);
  }, []);

  const handleMovePlacement = useCallback((id: string, tileX: number, tileY: number) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, tileX, tileY } : p)));
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="relative h-full overflow-hidden select-none bg-[#C6DAF0]">
      <PixelScreen
        months={age.months}
        pose={pose}
        childName={isDemo ? `${child.name} (데모)` : child.name}
        ageLabel={`D+${age.days} · ${age.months}개월 ${age.extraDays}일`}
        poseLabel={`${age.months}개월 · ${POSE_LABEL[pose]}`}
        stats={stats}
        onAction={handleAction}
        onPet={handlePet}
        onDecorate={handleDecorate}
        placements={placements}
        onMovePlacement={handleMovePlacement}
        onRemovePlacement={handleRemovePlacement}
      />

      <DecorateSheet
        open={decorating}
        onClose={() => setDecorating(false)}
        onPick={handlePick}
      />

      <BottomSheet
        open={openAction !== null}
        onClose={() => setOpenAction(null)}
        variant="sheet"
        ariaLabel={openAction ? ACTION_LABEL[openAction] : undefined}
        surfaceClassName="bg-[#FFFDF8] border-t-2 border-[#6F5B45]"
      >
        <div
          className="px-5 pt-3 pb-[max(var(--safe-area-bottom),20px)]"
          style={{ fontFamily: 'Galmuri11, monospace' }}
        >
          <div className="w-10 h-1 bg-[#6F5B45] mx-auto mb-4" />
          <h2 className="text-[17px] text-[#4A3B2C]">{openAction && ACTION_LABEL[openAction]}</h2>
          <p className="text-[12px] text-[#8A775F] mt-2 leading-relaxed">
            여기에 {openAction && ACTION_LABEL[openAction]} 입력 폼이 들어간다.
            모든 입력은 이 바텀시트 하나로 통일한다.
          </p>
          <div className="mt-5 h-32 border-2 border-dashed border-[#C2A67C] flex items-center justify-center text-[11px] text-[#A8926F]">
            입력 폼 자리
          </div>
          <button
            type="button"
            onClick={() => setOpenAction(null)}
            className="mt-5 w-full h-11 text-[14px] text-[#FFFDF8] bg-[#6F5B45] border-2 border-[#4A3B2C] active:translate-y-px"
          >
            닫기
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
