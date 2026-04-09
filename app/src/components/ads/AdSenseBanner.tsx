"use client";

import { useEffect, useRef } from "react";
import { usePlatform } from "@/hooks/usePlatform";

type Props = {
  /** AdSense 광고 단위 슬롯 ID */
  slot: string;
  /** 광고 형식 (기본: auto) */
  format?: string;
  /** 반응형 여부 (기본: true) */
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * AdSense 디스플레이 배너.
 *
 * 정책 준수:
 * - 웹 브라우저 환경("web")에서만 렌더링합니다.
 * - 앱 WebView("app") 및 판별 전("unknown")에는 아무것도 그리지 않습니다.
 * - client / slot 이 없으면 조용히 렌더링하지 않습니다.
 *
 * 사용 전제: <AdSenseScript /> 가 상위 어딘가에서 마운트되어 있어야 합니다.
 */
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSenseBanner({
  slot,
  format = "auto",
  responsive = true,
  className,
  style,
}: Props) {
  const platform = usePlatform();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (platform !== "web") return;
    if (!client || !slot) return;
    if (pushedRef.current) return;
    if (typeof window === "undefined") return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense 스크립트가 아직 로드되지 않았거나 차단됨 — 무시
    }
  }, [platform, client, slot]);

  if (platform !== "web") return null;
  if (!client || !slot) return null;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...style }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
