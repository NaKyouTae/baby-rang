'use client';

import BottomSheet from '@/components/BottomSheet';
import type { Placement } from './placements';

interface Props {
  target: Placement | null;
  onClose: () => void;
  onRemove: (id: string) => void;
}

/** 가구를 길게 눌렀을 때 뜨는 확인 시트. 브라우저 confirm 은 픽셀 화면과 안 어울린다. */
export default function RemoveSheet({ target, onClose, onRemove }: Props) {
  return (
    <BottomSheet
      open={target !== null}
      onClose={onClose}
      variant="sheet"
      ariaLabel="가구 치우기"
      surfaceClassName="bg-[#FFFBEF] border-t-2 border-[#7A5A36]"
    >
      <div
        className="px-5 pt-3 pb-[max(var(--safe-area-bottom),20px)]"
      >
        <div className="w-10 h-1 bg-[#7A5A36] mx-auto mb-4" />

        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center shrink-0"
            style={{ width: 56, height: 56, background: '#F2E6CE', border: '2px solid #C2A67C' }}
          >
            {target?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={target.imageUrl}
                alt=""
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span className="text-[10px]" style={{ color: '#A8926F' }}>
                그림 없음
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] text-[#4A3B2C] truncate">{target?.name}</p>
            <p className="mt-1 text-[11px]" style={{ color: '#A8926F' }}>
              방에서 치울까요? 다시 놓을 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 text-[14px] text-[#7A5A36] bg-[#FFFDF8] border-2 border-[#C2A67C] active:translate-y-px"
          >
            그대로 두기
          </button>
          <button
            type="button"
            onClick={() => target && onRemove(target.id)}
            className="flex-1 h-11 text-[14px] text-[#FFFBEF] bg-[#C45B78] border-2 border-[#8A3A50] active:translate-y-px"
          >
            치우기
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
