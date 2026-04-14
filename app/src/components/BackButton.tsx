'use client';

import { useRouter } from 'next/navigation';
import { palette } from '@/lib/colors';

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="뒤로가기"
      className="p-2"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
