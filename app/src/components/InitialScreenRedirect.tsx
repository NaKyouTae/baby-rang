'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveHomeTargetHref } from '@/components/menuCatalog';

// 초기 화면 리다이렉트는 앱/웹 로드당 1회만 수행한다.
// (홈으로 다시 돌아왔을 때 계속 튕기지 않도록 세션 플래그로 가드)
// 설정을 변경하면 InitialScreenSheet 저장 시 이 플래그를 지워 재적용한다.
const REDIRECT_FLAG = 'initial_screen_redirected';

/**
 * 홈 진입 시 사용자가 설정한 "초기 화면"으로 한 번 이동시킨다.
 * - 앱/웹 공통 단일 설정(homeMenu)을 사용한다.
 * - 미로그인/기본값(홈)이면 아무 것도 하지 않는다.
 * 홈 페이지에만 마운트되므로 홈으로의 첫 진입에서만 동작한다.
 */
export default function InitialScreenRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(REDIRECT_FLAG) === '1') return;
    } catch {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/screen-preference', { cache: 'no-store' });
        // 미로그인(401) → 플래그를 세우지 않고 종료(로그인 후 재진입 시 재시도 여지).
        if (!res.ok) return;
        const data = (await res.json()) as { home?: string };
        if (cancelled) return;

        try {
          sessionStorage.setItem(REDIRECT_FLAG, '1');
        } catch {
          /* noop */
        }

        const target = data.home;
        if (!target || target === 'home') return;

        const href = resolveHomeTargetHref(target);
        if (href && href !== '/home') router.replace(href);
      } catch {
        /* 네트워크 실패 — 홈 유지 */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
