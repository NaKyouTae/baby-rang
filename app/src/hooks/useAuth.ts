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

// 세션 슬라이딩: 새 토큰으로 쿠키 만료를 계속 연장 (fire-and-forget → 무한 로그인)
function slideSession() {
  fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' }).catch(() => {});
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
        if (data.authenticated === false) {
          // 토큰이 실제로 무효 → 진짜 로그아웃
          setAuthCache(false, null);
          setIsAuthenticated(false);
          setUser(null);
        } else {
          // 로그인 유지. 일시 실패(stale)면 user를 null로 덮지 않고 기존 값 유지.
          const u = (data.user as AuthUser | null) ?? cachedUser;
          setAuthCache(true, u);
          setIsAuthenticated(true);
          setUser(u);
          if (u) slideSession();
        }
      }
    } catch {
      /* 네트워크 실패 — 기존 상태 유지 */
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
            // children이 배열일 때만 캐시. null(조회 실패/타임아웃)이면 캐시하지 않아
            // useChildren이 스스로 재조회하게 둔다 → "아이 없음" 오표시 방지.
            if (Array.isArray(data.children)) {
              setChildrenCache(normalizeChildren(data.children));
            }
            // 로그인 확인되면 세션 슬라이드(무한 로그인)
            if (v && u) slideSession();
            // 인증은 유지됐지만 프로필이 일시 실패(user null)면 잠시 뒤 재조회로 자가 복구
            else if (v && !u) setTimeout(() => { refresh(); }, 1200);
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
