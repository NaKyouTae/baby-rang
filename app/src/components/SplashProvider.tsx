"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";

// 네이티브 splash 배경색과 동일하게 맞춰 두 화면이 자연스럽게 이어지도록 한다.
// (ios/BabyRang/BabyRangApp.swift 의 SplashView 배경: rgb(241,242,244))
const SPLASH_BG = "#F1F2F4";
const SPLASH_SESSION_FLAG = "splash_shown";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();

  // 한 세션 동안 splash는 첫 진입 1회만.
  // platform이 "unknown"으로 시작해 첫 렌더에서는 어차피 splash가 보이지 않으므로
  // lazy initializer로 sessionStorage를 읽어도 hydration mismatch가 발생하지 않는다.
  const [skipSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SPLASH_SESSION_FLAG) === "1";
  });

  useEffect(() => {
    if (platform === "app" && !skipSplash) {
      sessionStorage.setItem(SPLASH_SESSION_FLAG, "1");
    }
  }, [platform, skipSplash]);

  // 웹 브라우저에서는 splash 노출하지 않음. 네이티브 WebView(platform === 'app')에서만
  // native splash → 웹 splash로 자연스럽게 이어지게 한 번 보여준다.
  const show = platform === "app" && !skipSplash;

  useEffect(() => {
    if (!show) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [show]);

  return (
    <>
      {show && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            backgroundColor: SPLASH_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            touchAction: "none",
            overscrollBehavior: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/splash.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}
      {children}
    </>
  );
}
