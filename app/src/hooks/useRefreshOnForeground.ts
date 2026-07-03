'use client';

import { useEffect, useRef } from 'react';

/**
 * 앱이 다시 포그라운드로 돌아올 때 콜백을 호출해 화면 데이터를 갱신한다.
 *
 * 네이티브 WebView가 백그라운드로 내려갔다(페이드아웃/포커스아웃) 다시 올라오거나,
 * 브라우저 탭 전환·bfcache 복원(뒤로가기)·창 포커스 복귀 상황을 모두 처리한다.
 *
 * - visibilitychange(visible) / pageshow(persisted) / window focus 이벤트를 수신
 * - 여러 이벤트가 연달아 발생하므로 minIntervalMs(기본 1초) 내 중복 호출은 무시
 *
 * @param onForeground 포그라운드 복귀 시 실행할 갱신 함수(최신 참조를 항상 사용)
 * @param options.enabled false면 리스너를 등록하지 않는다(예: 로그인 전)
 * @param options.minIntervalMs 연속 이벤트 디바운스 간격(ms)
 */
export function useRefreshOnForeground(
  onForeground: () => void,
  { enabled = true, minIntervalMs = 1000 }: { enabled?: boolean; minIntervalMs?: number } = {},
) {
  const cbRef = useRef(onForeground);
  useEffect(() => {
    cbRef.current = onForeground;
  });
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const fire = () => {
      const now = Date.now();
      if (now - lastRef.current < minIntervalMs) return;
      lastRef.current = now;
      cbRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fire();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) fire();
    };
    const onFocus = () => fire();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, minIntervalMs]);
}
