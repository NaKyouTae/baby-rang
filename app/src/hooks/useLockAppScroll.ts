'use client';

import { useEffect } from 'react';

/**
 * 스크롤이 없는 전체화면 페이지에서 앱 셸의 스크롤 컨테이너(#app-scroll-container)를 잠근다.
 *
 * 셸은 모든 페이지를 overflow-y:auto 컨테이너에 담는다. 화면을 꽉 채우는 페이지라도 내용이
 * 컨테이너보다 1px 이라도 크거나, 캔버스를 끄는 터치가 스크롤로 이어지면 화면 전체가 위아래로
 * 흔들린다. 페이지가 떠 있는 동안만 스크롤과 당김 효과를 끄고, 나가면 원래대로 돌린다.
 */
export function useLockAppScroll() {
  useEffect(() => {
    const el = document.getElementById('app-scroll-container');
    if (!el) return;
    const prev = { overflow: el.style.overflow, overscroll: el.style.overscrollBehavior };
    el.scrollTop = 0;
    el.style.overflow = 'hidden';
    el.style.overscrollBehavior = 'none';
    return () => {
      el.style.overflow = prev.overflow;
      el.style.overscrollBehavior = prev.overscroll;
    };
  }, []);
}
