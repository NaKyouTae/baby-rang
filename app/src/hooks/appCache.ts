/**
 * 앱 전역 모듈 레벨 캐시.
 * useAuth, useChildren에서 공유하며, /api/init BFF 응답으로 한 번에 세팅.
 * 페이지 전환 시 재요청을 방지한다.
 */

import type { AuthUser } from './useAuth';

// --- Auth ---
export let cachedAuth: boolean | null = null;
export let cachedUser: AuthUser | null = null;
export const authListeners = new Set<(v: boolean, u: AuthUser | null) => void>();

export function setAuthCache(v: boolean, u: AuthUser | null) {
  cachedAuth = v;
  cachedUser = u;
  authListeners.forEach((l) => l(v, u));
}

// --- Children ---
export interface ChildData {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  profileImage?: string | null;
}

export let cachedChildren: ChildData[] | null = null;
export let childrenCacheLoaded = false;
export const childListeners = new Set<(children: ChildData[]) => void>();

export function setChildrenCache(children: ChildData[]) {
  cachedChildren = children;
  childrenCacheLoaded = true;
  childListeners.forEach((l) => l(children));
}
