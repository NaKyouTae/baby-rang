import type { Metadata } from "next";
import GrowthPatternClient from "./GrowthPatternClient";

export const metadata: Metadata = {
  title: "성장 패턴",
  description:
    "우리 아기의 키·몸무게 성장 곡선을 WHO 기준과 비교하고, 발달 패턴을 한눈에 확인하세요.",
  alternates: { canonical: "/growth-pattern" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 성장 패턴 분석",
  description:
    "아기의 키, 몸무게 성장 데이터를 WHO 국제 성장 곡선(백분위)과 비교하여 발달 패턴을 시각화합니다. 또래 대비 아기의 성장 위치를 확인할 수 있습니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "영유아 성장 분석",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/growth-pattern",
};

export default function GrowthPatternPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GrowthPatternClient />
    </>
  );
}
