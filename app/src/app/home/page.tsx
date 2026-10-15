import type { Metadata } from "next";
import { preload } from "react-dom";
import HomeClient from "./_components/HomeClient";
import { DEFAULT_FLOORING, DEFAULT_WALLPAPER } from "./_components/scene";

export const metadata: Metadata = {
  title: "홈",
  description:
    "아기랑 홈 - 기질 검사, 성장 기록, 원더윅스, 수면추천, 수유실 찾기 등 육아에 필요한 모든 기능을 한눈에 확인하세요.",
  alternates: { canonical: "/home" },
};

export default function HomePage() {
  // 홈을 바로 열 때도 바닥 그림을 HTML 과 함께 받기 시작한다
  preload(DEFAULT_WALLPAPER, { as: "image" });
  preload(DEFAULT_FLOORING, { as: "image" });
  return (
    <>
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 이 링크가 없으면
          fontFamily: Galmuri11 이 전부 monospace 로 떨어진다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <HomeClient />
    </>
  );
}
