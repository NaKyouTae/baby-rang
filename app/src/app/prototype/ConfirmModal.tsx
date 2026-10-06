'use client';

import type { ReactNode } from 'react';
import { GemIcon } from './icons';

interface Props {
  open: boolean;
  /** 썸네일로 보여줄 아이템 그림. 없으면 빈 상자로 둔다. */
  imageUrl?: string | null;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

/**
 * 가운데 확인 모달.
 *
 * 브라우저 confirm 은 픽셀 화면과 안 어울리고, 아이템 그림도 못 보여준다.
 */
export default function ConfirmModal({
  open,
  imageUrl,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-5" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-[350px] bg-[#FDFDFE] rounded-[16px] p-[20px] flex flex-col gap-[24px] items-center">
        <div className="w-full flex flex-col gap-[10px] items-center justify-center py-[8px]">
          <span className="size-[50px] flex items-center justify-center rounded-[4px] border border-[#121212] overflow-hidden">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="size-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span className="text-[10px] text-[#808991]">그림 없음</span>
            )}
          </span>
          <div className="flex items-center justify-center text-[#121212] text-[16px] text-center">
            {title}
          </div>
          <p className="w-full text-center text-[#808991] text-[14px] leading-[1.6]">
            {description}
          </p>
        </div>

        <div className="w-full flex gap-[10px] items-start">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] active:translate-y-px disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] active:translate-y-px disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "코시노(💎 3)를 구매할까요?" 처럼 이름 + 보석 아이콘 + 가격을 한 줄로. */
export function PriceTitle({ name, price }: { name: string; price: number }) {
  return (
    <>
      <span>{name}(</span>
      <GemIcon size={20} />
      <span>{` ${price})를 구매할까요?`}</span>
    </>
  );
}
