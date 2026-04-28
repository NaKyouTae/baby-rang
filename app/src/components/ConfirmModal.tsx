'use client';

import type { ReactNode } from 'react';
import { palette } from '@/lib/colors';

interface Props {
  open: boolean;
  /** @deprecated Use icon instead */
  emoji?: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  hideCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  open,
  emoji,
  icon,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  hideCancel = false,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 딤드 — 모바일 영역에만 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-full bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-[430px] px-6">
        <div
          className="w-full bg-white rounded-[8px] p-[16px] flex flex-col items-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">{icon ?? emoji ?? '⚠️'}</div>
          <h2 className="text-[16px] font-medium text-black text-center whitespace-pre-line">
            {title}
          </h2>
          {description && (
            <p className="mt-[8px] text-[12px] text-gray-500 text-center leading-relaxed whitespace-pre-line">
              {description}
            </p>
          )}
          <div className="mt-[16px] w-full flex gap-[8px]">
            {!hideCancel && (
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-[4px] bg-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-300 transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm();
              }}
              className="flex-1 py-3 rounded-[4px] font-semibold text-sm text-white transition-colors"
              style={{ backgroundColor: variant === 'danger' ? '#ef4444' : palette.teal }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
