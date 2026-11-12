'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { detectPlatform, setUserProperties, track } from '@/lib/analytics';

// 마지막으로 본 로그인 상태. 사용자 id, 또는 로그아웃이면 '-'.
const AUTH_KEY = 'ga-auth-user';
// 가입 직후로 볼 시간. 가입하고 홈에 처음 뜨기까지 걸리는 시간보다 넉넉하면 된다.
const SIGN_UP_WINDOW_MS = 30 * 60 * 1000;

function readLast(): string | null {
  try {
    return localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

function writeLast(value: string) {
  try {
    localStorage.setItem(AUTH_KEY, value);
  } catch {
    /* 저장 못 하면 다음 로그인 이벤트가 빠질 뿐이다 */
  }
}

/**
 * 앱 전역 GA 신호: 실행 환경(user property)과 로그인·가입 이벤트.
 *
 * 로그인은 카카오·네이버·애플, 웹 리다이렉트·네이티브 SDK 로 경로가 여럿이고
 * 모두 페이지를 통째로 다시 연다. 그래서 각 경로에 심지 않고, 로그인 상태가
 * '로그아웃 → 어떤 사용자'로 바뀐 것을 보고 판단한다.
 * - 계정이 막 만들어졌으면 sign_up, 아니면 login
 * - 이 기능을 배포하기 전부터 로그인해 있던 사용자는 기록이 없으므로 이벤트 없이 기억만 한다
 */
export default function AnalyticsBridge() {
  const { isAuthenticated, isLoaded, user } = useAuth();

  useEffect(() => {
    setUserProperties({ platform: detectPlatform() });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) {
      writeLast('-');
      return;
    }
    if (!user) return;

    const last = readLast();
    if (last === user.id) return;
    writeLast(user.id);

    const method = user.providers?.[0]?.toLowerCase() ?? 'unknown';
    const createdAt = user.createdAt ? Date.parse(user.createdAt) : NaN;
    if (Date.now() - createdAt < SIGN_UP_WINDOW_MS) {
      track('sign_up', { method });
    } else if (last === '-') {
      track('login', { method });
    }
  }, [isLoaded, isAuthenticated, user]);

  return null;
}
