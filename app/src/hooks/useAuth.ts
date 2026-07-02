'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  cachedAuth,
  cachedUser,
  authListeners,
  setAuthCache,
  setChildrenCache,
  hydrateFromStorage,
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

// 앱 로드당 /api/init 재검증을 1회만 수행하기 위한 플래그(모듈 전역, 새로고침 시 초기화)
let bootstrapStarted = false;

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
    const l = (v: boolean, u: AuthUser | null) => {
      setIsAuthenticated(v);
      setUser(u);
      setIsLoaded(true);
    };
    authListeners.add(l);

    // 콜드 스타트 SWR: localStorage 캐시를 즉시 복원해 스켈레톤 없이 렌더
    hydrateFromStorage();
    if (cachedAuth !== null) {
      setIsAuthenticated(cachedAuth);
      setUser(cachedUser);
      setIsLoaded(true);
    }

    // 앱 로드당 1회 백그라운드 재검증(/api/init). 캐시가 있으면 UI는 이미 그려진 상태라
    // 네트워크가 느려도(콜드 init) 스켈레톤이 보이지 않는다.
    if (!bootstrapStarted) {
      bootstrapStarted = true;
      (async () => {
        try {
          const res = await fetch('/api/init', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated === false) {
              // 토큰 실제 무효 → 진짜 로그아웃
              setAuthCache(false, null);
              setIsAuthenticated(false);
              setUser(null);
            } else {
              // 일시 실패(user null)면 기존 값 유지(SWR — 캐시 다운그레이드 방지)
              const u = (data.user as AuthUser | null) ?? cachedUser;
              setAuthCache(true, u);
              setIsAuthenticated(true);
              setUser(u);
              if (u) slideSession();
              else setTimeout(() => { refresh(); }, 1200);
            }
            setIsLoaded(true);
            // children은 배열일 때만 갱신(실패=null이면 기존 캐시 유지)
            if (Array.isArray(data.children)) {
              setChildrenCache(normalizeChildren(data.children));
            }
            return;
          }
        } catch {
          /* fallback */
        }
        await refresh();
      })();
    }

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
