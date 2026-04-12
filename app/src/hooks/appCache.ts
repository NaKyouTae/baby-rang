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

// --- Generic fetch cache ---
// URL 기반의 단순 메모리 캐시. 같은 URL에 대해 TTL 내 재요청을 방지한다.
const fetchCache = new Map<string, { data: any; ts: number }>();
const DEFAULT_TTL = 60_000; // 1분

export async function cachedFetch<T>(url: string, ttl = DEFAULT_TTL): Promise<T> {
  const now = Date.now();
  const cached = fetchCache.get(url);
  if (cached && now - cached.ts < ttl) return cached.data as T;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const data = await res.json();
  fetchCache.set(url, { data, ts: now });
  return data as T;
}

export function invalidateCache(urlPrefix: string) {
  for (const key of fetchCache.keys()) {
    if (key.startsWith(urlPrefix)) fetchCache.delete(key);
  }
}
