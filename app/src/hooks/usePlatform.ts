"use client";

import { useEffect, useState } from "react";

/**
 * 실행 환경 감지 훅.
 *
 * - "app"   : 아기랑 네이티브 WebView 래퍼 안에서 실행 중
 * - "web"   : 일반 모바일/PC 브라우저
 * - "unknown": 아직 판별 전 (SSR 혹은 마운트 직후 1프레임)
 *
 * AdSense / AdMob 정책 준수를 위해 "unknown" 상태에서는
 * 어떤 광고도 로드하지 않아야 합니다.
 *
 * 네이티브 래퍼는 다음 중 최소 하나를 주입해야 합니다:
 *  1) WebView User-Agent 에 " BabyrangApp/<version>" 을 append
 *  2) window.BabyrangBridge 객체 주입 (JS Bridge)
 *
 * 두 가지를 모두 체크하여 오탐/누락을 최소화합니다.
 */
export type Platform = "app" | "web" | "unknown";

declare global {
  interface Window {
    BabyrangBridge?: Record<string, unknown>;
  }
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasBridge =
      typeof window.BabyrangBridge === "object" &&
      window.BabyrangBridge !== null;

    const ua = window.navigator.userAgent || "";
    const hasUaFlag = /BabyrangApp\//i.test(ua);

    setPlatform(hasBridge || hasUaFlag ? "app" : "web"); // eslint-disable-line react-hooks/set-state-in-effect -- reading browser APIs on mount
  }, []);

  return platform;
}
