'use client';

import { useRouter } from 'next/navigation';
import { palette } from '@/lib/colors';

interface PageHeaderProps {
  title: string;
  /** 'back' = 왼쪽 뒤로가기 chevron, 'close' = 오른쪽 X 버튼 */
  variant?: 'back' | 'close';
  onAction?: () => void;
}

export default function PageHeader({
  title,
  variant = 'close',
  onAction,
}: PageHeaderProps) {
  const router = useRouter();
  const handleAction = onAction ?? (() => router.back());

  return (
    <header className="flex items-center justify-center relative px-5 py-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}>
      {variant === 'back' && (
        <button
          type="button"
          onClick={handleAction}
          aria-label="뒤로가기"
          className="absolute left-4 flex h-9 w-9 items-center justify-center"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={palette.black}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <h1 className="text-[16px] font-medium text-black">{title}</h1>

      {variant === 'close' && (
        <button
          type="button"
          onClick={handleAction}
          aria-label="닫기"
          className="absolute right-4 flex h-9 w-9 items-center justify-center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </header>
  );
}
