'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'location-consent';

type LocationConsent = 'granted' | 'denied' | null;

let snapshot: LocationConsent = null;
const listeners = new Set<() => void>();

function getSnapshot(): LocationConsent {
  return snapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(value: LocationConsent) {
  snapshot = value;
  listeners.forEach((l) => l());
}

// 초기 로드 시 localStorage에서 읽기
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied') {
      snapshot = raw;
    }
  } catch {}
}

/**
 * 위치 정보 동의 상태를 관리하는 훅.
 *
 * - null: 아직 물어보지 않음
 * - 'granted': 허용
 * - 'denied': 거부
 *
 * localStorage에 저장되므로 브라우저를 닫아도 유지됩니다.
 */
export function useLocationConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setConsent = useCallback((value: 'granted' | 'denied') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    emit(value);
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    emit(null);
  }, []);

  return { consent, setConsent, reset };
}
