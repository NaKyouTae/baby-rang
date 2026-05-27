"use client";

import { usePlatform } from "@/hooks/usePlatform";

// 네이티브 splash 배경색과 동일하게 맞춰 두 화면이 자연스럽게 이어지도록 한다.
// (ios/BabyRang/BabyRangApp.swift 의 SplashView 배경: rgb(241,242,244))
const SPLASH_BG = "#F1F2F4";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  const resolved = platform !== "unknown";

  return (
    <>
      {/* 앱/웹 판별 + hydration 이 끝나기 전에는 children 을 숨기고
          네이티브 splash 와 동일한 톤의 이미지를 깔아 흰 화면을 가린다. */}
      {!resolved && (
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
          }}
        >
          {/* 네이티브 SplashView(.aspectRatio(.fit))와 동일한 크기/위치로 맞춰
              네이티브→웹 전환 시 이미지 점프가 없도록 한다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/splash.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
      <div style={{ visibility: resolved ? "visible" : "hidden" }}>{children}</div>
    </>
  );
}
