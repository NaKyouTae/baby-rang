'use client';

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  emoji?: string;
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
  emoji = '⚠️',
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

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 text-white active:bg-red-600'
      : 'bg-gray-900 text-white active:bg-gray-800';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white rounded-3xl px-6 pt-7 pb-5 flex flex-col items-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-4xl mb-3">{emoji}</span>
        <h2 className="text-base font-bold text-gray-900 text-center whitespace-pre-line">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-xs text-gray-500 text-center leading-relaxed whitespace-pre-line">
            {description}
          </p>
        )}
        <div className="mt-6 w-full flex gap-2">
          {!hideCancel && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm active:bg-gray-200 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
