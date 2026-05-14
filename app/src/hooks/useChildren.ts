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
    try {
      const res = await fetch('/api/children');
      if (res.ok) {
        const data = await res.json();
        const sorted = normalizeChildren(data);
        setChildrenCache(sorted);
        setChildren(sorted);
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const l = (c: Child[]) => {
      setChildren(c as Child[]);
      setIsLoaded(true);
    };
    childListeners.add(l);
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
