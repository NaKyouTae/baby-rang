"use client";

import { usePlatform } from "@/hooks/usePlatform";
import AdSenseBanner from "./AdSenseBanner";
import AdMobBanner from "./AdMobBanner";

type Props = {
  /** AdSense 광고 슬롯 ID (웹 전용) */
  adsenseSlot?: string;
  /** AdMob 배너 광고 단위 ID (앱 전용) */
  admobUnitId?: string;
  /** 앱 배너 자리 높이 (px) */
  admobHeight?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 환경에 따라 AdSense 또는 AdMob 배너를 자동으로 고르는 통합 슬롯.
 *
 * - 웹    → AdSense 배너
 * - 앱    → AdMob 배너 (Bridge 경유)
 * - 판별 전 → 아무것도 렌더링하지 않음 (정책 안전)
 *
 * 어느 한쪽 ID 만 넘겨도 동작합니다. 둘 다 없으면 null.
 */
export default function AdSlot({
  adsenseSlot,
  admobUnitId,
  admobHeight,
  className,
  style,
}: Props) {
  const platform = usePlatform();

  if (platform === "unknown") return null;

  if (platform === "app") {
    if (!admobUnitId) return null;
    return (
      <AdMobBanner
        unitId={admobUnitId}
        height={admobHeight}
        className={className}
      />
    );
  }

  // web
  if (!adsenseSlot) return null;
  return (
    <AdSenseBanner slot={adsenseSlot} className={className} style={style} />
  );
}
