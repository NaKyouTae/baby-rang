import type { Metadata } from "next";
import AirQualityClient from "./AirQualityClient";
import AirQualityGuide from "./AirQualityGuide";

export const metadata: Metadata = {
  title: "미세먼지",
  description:
    "내 위치 기반 실시간 날씨, 미세먼지, 초미세먼지 정보를 확인하세요. 아기와 외출 전 대기질을 한눈에 파악할 수 있어요.",
  alternates: { canonical: "/air-quality" },
};

export default function AirQualityPage() {
  return (
    <>
      <AirQualityClient />
      {/* 위치와 무관한 고정 정보 — 서버에서 그려 크롤러가 읽을 본문을 만든다. */}
      <AirQualityGuide />
    </>
  );
}
