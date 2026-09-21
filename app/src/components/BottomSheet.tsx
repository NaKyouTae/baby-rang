'use client';

import { useEffect } from 'react';

type ZIndex = 70 | 80 | 90 | 100;
type Variant = 'floating' | 'sheet';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: ZIndex;
  maxHeight?: string;
  surfaceClassName?: string;
  lockBodyScroll?: boolean;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  /**
   * 'floating'(기본): 화면 아래에 떠있는 모달 형태(네 모서리 둥글고 좌우/하단 여백)
   * 'sheet': 화면 하단에 붙는 진짜 바텀시트(상단 모서리만 둥글고 좌우/하단 여백 없음)
   */
  variant?: Variant;
}

const Z_CLASS: Record<ZIndex, string> = {
  70: 'z-[70]',
  80: 'z-[80]',
  90: 'z-[90]',
  100: 'z-[100]',
};

export default function BottomSheet({
  open,
  onClose,
  children,
  zIndex = 70,
  maxHeight = '90vh',
  surfaceClassName = 'bg-white',
  lockBodyScroll = true,
  closeOnBackdrop = true,
  ariaLabel,
  variant = 'floating',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  if (!open) return null;

  const wrapperPadding =
    variant === 'sheet'
      ? ''
      : 'px-4 pb-[max(var(--safe-area-bottom),16px)]';
  const surfaceRounded =
    variant === 'sheet' ? 'rounded-t-3xl' : 'rounded-3xl';

  return (
    <div
      className={`fixed inset-0 ${Z_CLASS[zIndex]} flex items-end justify-center ${wrapperPadding}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/40 -z-10" />
      <div
        className={`relative w-full max-w-[430px] ${surfaceClassName} ${surfaceRounded} shadow-2xl flex flex-col overflow-hidden`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
