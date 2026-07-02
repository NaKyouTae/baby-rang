'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import { toKstYmd } from '@/lib/childAge';
import {
  cachedChildren,
  childrenCacheLoaded,
  childListeners,
  setChildrenCache,
  hydrateFromStorage,
  selectedChildId as storedSelectedChildId,
  selectedChildListeners,
  setSelectedChildId,
} from './appCache';

export type Gender = 'male' | 'female';

export const GENDER_LABEL: Record<Gender, string> = {
  male: '남아',
  female: '여아',
};

export interface Child {
  id: string;
  name: string;
  gender: string;
  birthDate: string; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  profileImage?: string | null;
  isShared?: boolean;
  ownerNickname?: string | null;
}

function normalizeChildren(data: (Child & { birthDate: string })[]): Child[] {
  return data
    .map((c) => ({
      ...c,
      birthDate: toKstYmd(c.birthDate),
      dueDate: c.dueDate ? toKstYmd(c.dueDate) : null,
    }))
    .sort((a, b) => b.birthDate.localeCompare(a.birthDate));
}

/**
 * 접근 가능한 아이 목록이 바뀌는 동작(그룹 참여/탈퇴 등) 이후 전역 children 캐시를
 * 강제로 재조회한다. setChildrenCache 가 childListeners 로 브로드캐스트하므로,
 * 마운트된 모든 useChildren 소비자(기록/패턴 페이지 등)가 즉시 갱신된다.
 */
export async function refreshChildrenCache(): Promise<void> {
  try {
    const res = await fetch('/api/children', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setChildrenCache(normalizeChildren(data));
    }
  } catch {
    // ignore
  }
}

export function useChildren() {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { requireLogin } = useLoginPrompt();
  const [children, setChildren] = useState<Child[]>((cachedChildren as Child[]) ?? []);
  const [isLoaded, setIsLoaded] = useState(childrenCacheLoaded);

  const fetchChildren = useCallback(async () => {
    if (!isAuthenticated) {
      setChildrenCache([]);
      setChildren([]);
      setIsLoaded(true);
      return;
    }
    // 일시적 실패(콜드스타트/네트워크)로 "아이 없음"이 캐시되지 않도록 재시도.
    // 성공(200) 응답일 때만 캐시하며, 빈 배열도 실제 200이면 정상 반영한다.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/children', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const sorted = normalizeChildren(data);
          setChildrenCache(sorted);
          setChildren(sorted);
          setIsLoaded(true);
          return;
        }
        // 인증 문제는 재시도해도 소용없음 → 중단
        if (res.status === 401 || res.status === 403) break;
      } catch {
        /* 네트워크 실패 → 재시도 */
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    // 모든 시도 실패 — 캐시를 남기지 않아(오염 방지) 다음 트리거에 재조회한다.
    setIsLoaded(true);
  }, [isAuthenticated]);

  useEffect(() => {
    const l = (c: Child[]) => {
      setChildren(c as Child[]);
      setIsLoaded(true);
    };
    childListeners.add(l);
    // 콜드 스타트 SWR: localStorage 캐시 복원 후 즉시 반영(스켈레톤 없이 렌더)
    hydrateFromStorage();
    if (cachedChildren !== null) {
      setChildren(cachedChildren as Child[]);
      setIsLoaded(true);
    }
    return () => { childListeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    // 캐시가 있으면 재요청하지 않음
    if (cachedChildren !== null) {
      setChildren(cachedChildren as Child[]);
      setIsLoaded(true);
      return;
    }
    fetchChildren();
  }, [fetchChildren, authLoaded]);

  // 앞선 조회가 실패해 캐시가 비어있으면(=null), 탭 복귀 시 다시 시도해 자가 복구한다.
  useEffect(() => {
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        isAuthenticated &&
        cachedChildren === null
      ) {
        fetchChildren();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isAuthenticated, fetchChildren]);

  const addChild = useCallback(
    async (name: string, gender: string, birthDate: string, profileImage?: File, dueDate?: string) => {
      if (!requireLogin()) return;
      const formData = new FormData();
      formData.append('name', name);
      formData.append('gender', gender);
      formData.append('birthDate', birthDate);
      if (dueDate) formData.append('dueDate', dueDate);
      if (profileImage) formData.append('profileImage', profileImage);

      const res = await fetch('/api/children', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) await fetchChildren();
    },
    [fetchChildren, requireLogin],
  );

  const updateChild = useCallback(
    async (id: string, name: string, gender: string, birthDate: string, profileImage?: File, dueDate?: string) => {
      if (!requireLogin()) return;
      const formData = new FormData();
      formData.append('name', name);
      formData.append('gender', gender);
      formData.append('birthDate', birthDate);
      if (dueDate) formData.append('dueDate', dueDate);
      if (profileImage) formData.append('profileImage', profileImage);

      const res = await fetch(`/api/children/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (res.ok) await fetchChildren();
    },
    [fetchChildren, requireLogin],
  );

  const removeChild = useCallback(
    async (id: string) => {
      if (!requireLogin()) return;
      const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchChildren();
    },
    [fetchChildren, requireLogin],
  );

  return { children, isLoaded, addChild, removeChild, updateChild };
}

/**
 * 전역으로 "현재 선택된 아이"를 유지한다.
 * - localStorage 에 id 만 저장되어 새 세션에서도 복원
 * - 아직 children 이 로드되지 않았으면 null 반환
 * - 저장된 id 가 children 에 없거나 비어 있으면 children[0] 으로 폴백 후 전역에 저장
 */
export function useSelectedChild() {
  const { children, isLoaded } = useChildren();
  const [currentId, setCurrentId] = useState<string | null>(storedSelectedChildId);

  useEffect(() => {
    const l = (id: string | null) => setCurrentId(id);
    selectedChildListeners.add(l);
    return () => { selectedChildListeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!isLoaded || children.length === 0) return;
    const exists = currentId && children.some((c) => c.id === currentId);
    if (!exists) setSelectedChildId(children[0].id);
  }, [isLoaded, children, currentId]);

  const selectedChild =
    children.find((c) => c.id === currentId) ??
    (isLoaded && children.length > 0 ? children[0] : null);

  return {
    children,
    isLoaded,
    selectedChild,
    selectChild: (child: Child | null) => setSelectedChildId(child?.id ?? null),
  };
}
