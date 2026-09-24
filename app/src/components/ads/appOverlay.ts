"use client";

import { useEffect } from "react";

// 웹 오버레이(바텀시트·모달)가 열려 있는 동안 네이티브 앱 배너를 숨기기 위한 잠금.
//
// 왜 필요한가:
// 앱 배너(AdMob)는 WKWebView '위에' 얹힌 네이티브 UIView 다.
// 웹에서 z-index 를 아무리 올려도 WebView 안의 요소는 그 위로 올라갈 수 없어서,
// 바텀시트를 열면 배너가 시트를 덮어버린다.
// 그래서 오버레이가 열린 동안에는 네이티브에 "이 화면엔 배너 자리가 없다"고 알려
// 배너 자체를 숨긴다.
//
// 오버레이는 중첩될 수 있으므로(시트 위에 확인 모달 등) 개수로 센다.

let openCount = 0;
const listeners = new Set<() => void>();

/** 열려 있는 오버레이가 하나라도 있는지. */
export function isAppOverlayOpen(): boolean {
  return openCount > 0;
}

/** 오버레이 개수가 바뀔 때 알림을 받는다. */
export function subscribeAppOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 오버레이가 열려 있는 동안 배너를 숨긴다.
 *
 * 훅 규칙상 조건부로 호출할 수 없으므로 `open` 을 인자로 받아
 * 컴포넌트 최상단에서 항상 호출한다.
 */
export function useAppOverlayLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    listeners.forEach((l) => l());
    return () => {
      openCount -= 1;
      listeners.forEach((l) => l());
    };
  }, [open]);
}
