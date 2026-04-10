'use client';

import { useEffect, useState, useCallback } from 'react';

export type AuthUser = {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole?: string | null;
  onboardedAt?: string | null;
};

let cachedAuth: boolean | null = null;
let cachedUser: AuthUser | null = null;
const listeners = new Set<(v: boolean, u: AuthUser | null) => void>();

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
        cachedAuth = v;
        cachedUser = u;
        setIsAuthenticated(v);
        setUser(u);
        listeners.forEach((l) => l(v, u));
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (cachedAuth === null) refresh();
    const l = (v: boolean, u: AuthUser | null) => {
      setIsAuthenticated(v);
      setUser(u);
    };
    listeners.add(l);

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
      listeners.delete(l);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { isAuthenticated, user, isLoaded, refresh };
}
