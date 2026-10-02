import type { Metadata } from "next";
import Link from "next/link";
import AirQualityGuide from "../air-quality/AirQualityGuide";

const SITE_URL = "https://baby-rang.spectrify.kr";
const PAGE_URL = `${SITE_URL}/air-quality-guide`;

export const metadata: Metadata = {
  title: "미세먼지 등급 기준과 아기 외출 가이드",
  description:
    "환경부 통합대기환경지수 기준으로 미세먼지(PM10)·초미세먼지(PM2.5) 등급이 어떻게 나뉘는지와 등급별 아기 외출 요령을 정리했습니다.",
  alternates: { canonical: "/air-quality-guide" },
  openGraph: {
    title: "미세먼지 등급 기준과 아기 외출 가이드 | 아기랑",
    description:
      "PM10·PM2.5 등급 기준과 등급별 외출 요령을 정리했습니다.",
    url: PAGE_URL,
  },
};

/**
 * 미세먼지 등급 기준 문서 페이지.
 *
 * 등급표는 위치와 무관한 고정 정보라 실시간 수치 화면(/air-quality)과 성격이 다르다.
 * 기능 화면에 붙여두면 오늘 대기질을 보러 온 사용자에게 긴 표가 딸려 나오므로
 * 별도 URL 로 분리했다.
 */
export default function AirQualityGuidePage() {
  return (
    <>
      <AirQualityGuide />

      <div className="px-5 pb-12">
        <Link
          href="/air-quality"
          className="block rounded-[8px] bg-gray-100 px-4 py-3 text-[13px] font-medium text-gray-600 active:bg-gray-200"
        >
          우리 동네 실시간 미세먼지 보기 →
        </Link>
      </div>
    </>
  );
}
