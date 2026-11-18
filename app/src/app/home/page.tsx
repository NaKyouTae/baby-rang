import type { Metadata } from "next";
import HomeClient from "./_components/HomeClient";

export const metadata: Metadata = {
  title: "홈",
  description:
    "베이비룸 홈 - 수유·수면·기저귀를 한 번의 터치로 기록하고, 마지막 수유·기저귀 시간과 픽셀 아기방을 한눈에 확인하세요. 소아과용 기록 요약도 바로 열 수 있어요.",
  alternates: { canonical: "/home" },
};

export default function HomePage() {
  return (
    <>
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 이 링크가 없으면
          fontFamily: Galmuri11 이 전부 monospace 로 떨어진다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <HomeClient />
    </>
  );
}
