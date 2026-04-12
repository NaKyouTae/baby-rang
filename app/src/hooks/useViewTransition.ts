'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * View Transitions API를 활용한 네이티브급 화면 전환.
 * 지원하지 않는 브라우저에서는 일반 navigation으로 fallback.
 */
export function useViewTransitionRouter() {
  const router = useRouter();

  const push = useCallback(
    (href: string) => {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return { ...router, push };
}
