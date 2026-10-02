import type { Metadata } from "next";
import AirQualityClient from "./AirQualityClient";
import Link from "next/link";

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

      {/* 등급 기준표는 /air-quality-guide 로 분리했다. 사이트맵에만 있고 들어오는
          링크가 없으면 크롤러가 고아 페이지로 보고 색인하지 않는다. */}
      <div className="px-5 pb-[calc(var(--bottom-nav-space)+16px)]">
        <Link
          href="/air-quality-guide"
          className="block rounded-[8px] bg-gray-100 px-4 py-3 text-[13px] font-medium text-gray-600 active:bg-gray-200"
        >
          미세먼지 등급 기준 보기 →
        </Link>
      </div>
    </>
  );
}
