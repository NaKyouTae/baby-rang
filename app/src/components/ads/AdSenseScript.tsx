"use client";

import { useEffect } from "react";
import { usePlatform } from "@/hooks/usePlatform";

/**
 * Google AdSense 스크립트 로더.
 *
 * 반드시 지켜야 하는 정책:
 * - AdSense 스크립트는 "웹 브라우저"에서만 로드합니다.
 *   네이티브 앱 WebView 안에서 로드되면 AdSense 계정 정지 사유가 됩니다.
 * - 따라서 usePlatform() === "web" 으로 확정된 이후에만 주입합니다.
 * - "unknown" 상태에서는 절대 주입하지 않습니다.
 *
 * 한 페이지에 여러 번 마운트되더라도 스크립트는 1회만 삽입됩니다.
 */

const SCRIPT_ID = "adsbygoogle-js";

export default function AdSenseScript() {
  const platform = usePlatform();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (platform !== "web") return;
    if (!client) return;
    if (typeof document === "undefined") return;
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      client,
    )}`;
    document.head.appendChild(script);
  }, [platform, client]);

  return null;
}
