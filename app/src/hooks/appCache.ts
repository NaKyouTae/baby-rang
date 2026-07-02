/**
 * 앱 전역 모듈 레벨 캐시.
 * useAuth, useChildren에서 공유하며, /api/init BFF 응답으로 한 번에 세팅.
 * 페이지 전환 시 재요청을 방지한다.
 */

import type { AuthUser } from './useAuth';

// --- localStorage 지속 (콜드 스타트 stale-while-revalidate용) ---
const AUTH_LS_KEY = 'baby-rang:auth';
const CHILDREN_LS_KEY = 'baby-rang:children';

function lsRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsWrite(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

// --- Auth ---
export let cachedAuth: boolean | null = null;
export let cachedUser: AuthUser | null = null;
export const authListeners = new Set<(v: boolean, u: AuthUser | null) => void>();

export function setAuthCache(v: boolean, u: AuthUser | null) {
  cachedAuth = v;
  cachedUser = u;
  lsWrite(AUTH_LS_KEY, { authenticated: v, user: u });
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
  lsWrite(CHILDREN_LS_KEY, children);
  childListeners.forEach((l) => l(children));
}

// 로그아웃/탈퇴 시 지속 캐시를 비워 재로그인 시 stale 상태 플래시를 방지한다.
export function clearAuthCaches() {
  cachedAuth = false;
  cachedUser = null;
  cachedChildren = [];
  childrenCacheLoaded = true;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AUTH_LS_KEY);
      window.localStorage.removeItem(CHILDREN_LS_KEY);
    } catch {
      /* ignore */
    }
  }
  authListeners.forEach((l) => l(false, null));
  childListeners.forEach((l) => l([]));
}

// 콜드 스타트 시 localStorage 캐시를 즉시 메모리 캐시로 복원(1회).
// import 시점이 아니라 클라이언트 mount 후 호출해 SSR 하이드레이션 불일치를 피한다.
let storageHydrated = false;
export function hydrateFromStorage() {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;
  const a = lsRead<{ authenticated: boolean; user: AuthUser | null }>(AUTH_LS_KEY);
  if (a && typeof a.authenticated === 'boolean') {
    setAuthCache(a.authenticated, a.user ?? null);
  }
  const c = lsRead<ChildData[]>(CHILDREN_LS_KEY);
  if (Array.isArray(c)) {
    setChildrenCache(c);
  }
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
const GEO_LS_KEY = 'geo_last'; // 마지막 좌표(세션 넘어 재사용)

// 마지막으로 확보한 좌표(메모리 → localStorage 순). 홈 화면이 위치 확정을 기다리지 않고
// 즉시 날씨/미세먼지/주변 수유실을 조회하도록 하는 용도. (fresh 좌표는 뒤이어 갱신)
export function getLastKnownPosition(): { lat: number; lng: number } | null {
  if (cachedPosition) return { lat: cachedPosition.lat, lng: cachedPosition.lng };
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GEO_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.lat === 'number' && typeof p?.lng === 'number') {
      return { lat: p.lat, lng: p.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

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
        // 다음 앱 실행에서 즉시 사용하도록 영속화
        try {
          window.localStorage.setItem(
            GEO_LS_KEY,
            JSON.stringify({ lat: cachedPosition.lat, lng: cachedPosition.lng, ts: cachedPosition.ts }),
          );
        } catch {
          /* ignore */
        }
        resolve(cachedPosition);
      },
      (err) => reject(err),
      opts ?? { enableHighAccuracy: false, timeout: 4000, maximumAge: 600_000 },
    );
  });
  inflightPosition = p;
  // 성공/실패 후 in-flight 해제(실패 시 다음 호출이 재시도 가능)
  p.finally(() => {
    if (inflightPosition === p) inflightPosition = null;
  }).catch(() => {});
  return p;
}
