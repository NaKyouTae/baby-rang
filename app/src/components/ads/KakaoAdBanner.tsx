"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 카카오 광고 unit ID (예: "DAN-go0noPJx8cIt6SU7") */
  unit: string;
  /** 광고 너비 강제값. 미지정 시 디바이스 너비(최대 430)에 맞춤 */
  width?: number;
  /** 광고 높이 (기본: 50) */
  height?: number;
  className?: string;
};

const APP_MAX_WIDTH = 430;
const DEFAULT_WIDTH = 320;

/**
 * 카카오 디스플레이 배너.
 * width 미지정 시 디바이스 너비(앱 max-width 430까지)에 맞춰 data-ad-width를 설정한다.
 */
export default function KakaoAdBanner({
  unit,
  width: widthOverride,
  height = 50,
  className,
}: Props) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!unit) return;
    if (typeof document === "undefined") return;

    const ins = insRef.current;
    if (ins) {
      const w =
        widthOverride ??
        Math.min(window.innerWidth || DEFAULT_WIDTH, APP_MAX_WIDTH);
      ins.setAttribute("data-ad-width", String(w));
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {
        // 이미 제거됐거나 못 찾는 경우 무시
      }
    };
  }, [unit, widthOverride]);

  if (!unit) return null;

  return (
    <ins
      ref={insRef}
      className={`kakao_ad_area ${className ?? ""}`.trim()}
      style={{ display: "none" }}
      data-ad-unit={unit}
      data-ad-width={String(widthOverride ?? DEFAULT_WIDTH)}
      data-ad-height={String(height)}
    />
  );
}
