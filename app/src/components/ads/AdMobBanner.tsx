"use client";

import { useEffect, useRef } from "react";
import { usePlatform } from "@/hooks/usePlatform";

type Props = {
  /**
   * AdMob 배너 광고 단위 ID.
   * 네이티브 앱 쪽에서 이 ID 로 GADBannerView / AdView 를 로드해야 합니다.
   */
  unitId: string;
  /** 배너 높이 (px). 실제 광고는 네이티브가 그립니다. placeholder 용. */
  height?: number;
  className?: string;
};

/**
 * AdMob 배너 (네이티브 Bridge 경유).
 *
 * 정책 준수:
 * - 오직 네이티브 WebView 앱 안("app")에서만 동작합니다.
 * - 일반 웹 브라우저("web")에서는 렌더링 자체를 하지 않습니다.
 *   (AdMob 을 웹에서 호출하는 것은 정책 위반)
 *
 * 동작 방식:
 * - 컴포넌트 마운트 시 window.BabyrangBridge.showBanner(unitId) 호출
 * - 언마운트 시 window.BabyrangBridge.hideBanner() 호출
 * - 실제 배너는 네이티브 레이어가 WebView 위에 오버레이로 그립니다.
 *
 * 네이티브가 Bridge 메서드를 구현하지 않았다면 조용히 no-op 됩니다.
 */
type BridgeWithBanner = {
  showBanner?: (unitId: string) => void;
  hideBanner?: () => void;
};

export default function AdMobBanner({
  unitId,
  height = 60,
  className,
}: Props) {
  const platform = usePlatform();
  const shownRef = useRef(false);

  useEffect(() => {
    if (platform !== "app") return;
    if (!unitId) return;
    if (typeof window === "undefined") return;

    const bridge = window.BabyrangBridge as BridgeWithBanner | undefined;
    if (!bridge) return;

    try {
      bridge.showBanner?.(unitId);
      shownRef.current = true;
    } catch {
      // Bridge 미구현 혹은 예외 — 무시
    }

    return () => {
      if (!shownRef.current) return;
      try {
        bridge.hideBanner?.();
      } catch {
        // no-op
      }
      shownRef.current = false;
    };
  }, [platform, unitId]);

  if (platform !== "app") return null;
  if (!unitId) return null;

  // 네이티브 배너가 오버레이될 자리만 잡아둠.
  return (
    <div
      className={className}
      style={{ width: "100%", height, background: "transparent" }}
      aria-hidden
    />
  );
}
