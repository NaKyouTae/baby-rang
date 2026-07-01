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

// --- Selected Child (persisted) ---
// 페이지 간 이동 시 어떤 아이가 "현재 선택" 상태인지 기억하기 위한 전역 상태.
// localStorage 에 id 만 저장하여 새 세션에서도 복원 가능.
const SELECTED_CHILD_KEY = 'baby-rang:selected-child-id';

function readStoredSelectedChildId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_CHILD_KEY);
  } catch {
    return null;
  }
}

export let selectedChildId: string | null = readStoredSelectedChildId();
export const selectedChildListeners = new Set<(id: string | null) => void>();

export function setSelectedChildId(id: string | null) {
  if (selectedChildId === id) return;
  selectedChildId = id;
  if (typeof window !== 'undefined') {
    try {
      if (id) window.localStorage.setItem(SELECTED_CHILD_KEY, id);
      else window.localStorage.removeItem(SELECTED_CHILD_KEY);
    } catch {
      /* ignore */
    }
  }
  selectedChildListeners.forEach((l) => l(id));
}

// --- Generic fetch cache ---
// URL 기반의 단순 메모리 캐시. 같은 URL에 대해 TTL 내 재요청을 방지한다.
const fetchCache = new Map<string, { data: unknown; ts: number }>();
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

// --- Shared geolocation ---
// 여러 컴포넌트(날씨/주변 수유실)가 각자 getCurrentPosition을 호출하면
// WKWebView에서 권한 프롬프트가 중복되고 지연이 배가된다.
// 좌표를 모듈 레벨에 캐시하고 진행 중 요청을 공유(dedupe)해 위치 요청을 1회로 합친다.
interface SharedPosition {
  lat: number;
  lng: number;
  ts: number;
}
let cachedPosition: SharedPosition | null = null;
let inflightPosition: Promise<SharedPosition> | null = null;
const GEO_TTL = 5 * 60_000; // 5분

export function getSharedPosition(opts?: PositionOptions): Promise<SharedPosition> {
  const now = Date.now();
  if (cachedPosition && now - cachedPosition.ts < GEO_TTL) {
    return Promise.resolve(cachedPosition);
  }
  if (inflightPosition) return inflightPosition;

  const p = new Promise<SharedPosition>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
        };
        resolve(cachedPosition);
      },
      (err) => reject(err),
      opts ?? { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
  inflightPosition = p;
  // 성공/실패 후 in-flight 해제(실패 시 다음 호출이 재시도 가능)
  p.finally(() => {
    if (inflightPosition === p) inflightPosition = null;
  }).catch(() => {});
  return p;
}
