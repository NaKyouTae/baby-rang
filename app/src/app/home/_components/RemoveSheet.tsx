'use client';

import BottomSheet from '@/components/BottomSheet';
import type { Placement } from './placements';

interface Props {
  target: Placement | null;
  onClose: () => void;
  onRemove: (id: string) => void;
}

/**
 * 가구를 길게 눌렀을 때 뜨는 확인 시트. 브라우저 confirm 은 픽셀 화면과 안 어울린다.
 * 전용 디자인이 없어 꾸미기 시트·구매 확인과 같은 상자·버튼 모양을 쓴다.
 */
export default function RemoveSheet({ target, onClose, onRemove }: Props) {
  return (
    <BottomSheet
      open={target !== null}
      onClose={onClose}
      variant="sheet"
      ariaLabel="가구 치우기"
      surfaceClassName="bg-[#FDFDFE] rounded-t-[16px]"
    >
      <div className="px-[20px] pt-[16px] pb-[max(var(--safe-area-bottom),20px)]">
        <div className="w-[36px] h-[4px] bg-[#121212] rounded-full mx-auto" />

        <div className="mt-[20px] flex items-center gap-[10px]">
          <span className="size-[50px] flex items-center justify-center shrink-0 rounded-[4px] border border-[#121212] overflow-hidden">
            {target?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={target.imageUrl}
                alt=""
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[16px] leading-[1.4] text-[#121212] truncate">{target?.name}</p>
            <p className="mt-[4px] text-[14px] leading-[1.4] text-[#808991]">
              방에서 치울까요? 다시 놓을 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-[24px] flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] active:translate-y-px"
          >
            그대로 두기
          </button>
          <button
            type="button"
            onClick={() => target && onRemove(target.id)}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] active:translate-y-px"
          >
            치우기
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
