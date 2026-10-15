'use client';

import { useEffect } from 'react';
import { useAppOverlayLock } from './ads/appOverlay';

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
  /** 픽셀 화면(아기랑 홈·기록 등)용 — 흰 바탕 #FDFDFE, 위 모서리 16px, 픽셀 폰트 */
  pixel?: boolean;
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
  pixel = false,
}: BottomSheetProps) {
  // 열려 있는 동안 네이티브 앱 배너를 숨긴다(배너가 시트를 덮는 것 방지).
  useAppOverlayLock(open);

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
  const surfaceRounded = pixel
    ? variant === 'sheet'
      ? 'rounded-t-[16px]'
      : 'rounded-[16px]'
    : variant === 'sheet'
      ? 'rounded-t-3xl'
      : 'rounded-3xl';
  const surface = pixel ? 'bg-[#FDFDFE]' : surfaceClassName;

  return (
    <div
      className={`fixed inset-0 ${Z_CLASS[zIndex]} flex items-end justify-center ${wrapperPadding}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/50 -z-10" />
      <div
        className={`relative w-full max-w-[430px] ${surface} ${surfaceRounded} shadow-2xl flex flex-col overflow-hidden`}
        style={{
          maxHeight,
          ...(pixel ? { fontFamily: 'Galmuri11Fig, Galmuri11, monospace' } : null),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
