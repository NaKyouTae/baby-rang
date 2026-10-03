'use client';

import { useCallback, useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { calcChildAge } from '@/lib/childAge';
import { useSelectedChild } from '@/hooks/useChildren';
import PixelScreen from './PixelScreen';
import { POSE_LABEL, poseForMonths } from './pixelSprite';
import type { ActionId } from './scene';

/** 로그인/아이 등록 전에도 화면을 볼 수 있게 두는 미리보기용 아이. */
const DEMO = { name: '아기', birthDate: demoBirthDate(14) };

function demoBirthDate(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
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

  const handleAction = useCallback((id: ActionId) => setOpenAction(id), []);
  const handlePet = useCallback(() => {}, []);

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
