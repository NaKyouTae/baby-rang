import type { Metadata } from "next";
import AirQualityClient from "./AirQualityClient";

export const metadata: Metadata = {
  title: "미세먼지",
  description:
    "내 위치 기반 실시간 날씨, 미세먼지, 초미세먼지 정보를 확인하세요. 아이와 외출 전 대기질을 한눈에 파악할 수 있어요.",
  alternates: { canonical: "/air-quality" },
};

export default function AirQualityPage() {
  return <AirQualityClient />;
}
