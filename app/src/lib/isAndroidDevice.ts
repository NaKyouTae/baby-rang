"use client";

import { useSyncExternalStore } from "react";

// 안드로이드 기기인지 판별한다. 앱(네이티브·TWA)이든 브라우저든 상관없이 기기 기준이다.
//
// ⚠️ isAndroidApp(앱 안에서 열렸는지)과는 다른 질문이다.
//    Apple 로그인 버튼처럼 "안드로이드에서는 아예 보여줄 필요가 없는" UI 에 쓴다.

export function isAndroidDevice(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { Android?: unknown };
  return !!w.Android || /android/i.test(window.navigator.userAgent);
}

// 기기는 세션 중에 바뀌지 않으므로 구독할 대상이 없다.
const subscribe = () => () => {};
// 서버 렌더 시점에는 판별할 수 없다. 확정 전을 뜻하는 null 을 돌려준다.
const getServerSnapshot = () => null;

/** 안드로이드 기기 여부 훅. 판별 전에는 null. */
export function useIsAndroidDevice(): boolean | null {
  return useSyncExternalStore(subscribe, isAndroidDevice, getServerSnapshot);
}
