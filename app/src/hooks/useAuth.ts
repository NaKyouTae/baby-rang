'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  cachedAuth,
  cachedUser,
  authListeners,
  setAuthCache,
  setChildrenCache,
} from './appCache';
import type { ChildData } from './appCache';

export type AuthUser = {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole?: string | null;
  onboardedAt?: string | null;
};

import { toKstYmd } from '@/lib/childAge';

function normalizeChildren(data: (ChildData & { birthDate: string })[]): ChildData[] {
  return data
    .map((c) => ({
      ...c,
      birthDate: toKstYmd(c.birthDate),
    }))
    .sort((a, b) => b.birthDate.localeCompare(a.birthDate));
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(cachedAuth ?? false);
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [isLoaded, setIsLoaded] = useState<boolean>(cachedAuth !== null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/token', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const v = !!data.authenticated;
        const u = (data.user as AuthUser | null) ?? null;
        setAuthCache(v, u);
        setIsAuthenticated(v);
        setUser(u);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (cachedAuth === null) {
      // 첫 로드: /api/init BFF로 auth + children 한 번에 가져오기
      (async () => {
        try {
          const res = await fetch('/api/init', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const v = !!data.authenticated;
            const u = (data.user as AuthUser | null) ?? null;
            setAuthCache(v, u);
            setIsAuthenticated(v);
            setUser(u);
            setIsLoaded(true);
            // children 캐시도 동시에 세팅
            setChildrenCache(normalizeChildren(data.children ?? []));
            return;
          }
        } catch {
          /* fallback */
        }
        // init 실패 시 기존 방식 fallback
        await refresh();
      })();
    }
    const l = (v: boolean, u: AuthUser | null) => {
      setIsAuthenticated(v);
      setUser(u);
      setIsLoaded(true);
    };
    authListeners.add(l);

    // bfcache 복원(뒤로가기) / 탭 포커스 복귀 시 인증 상태 재동기화
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      authListeners.delete(l);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { isAuthenticated, user, isLoaded, refresh };
}
