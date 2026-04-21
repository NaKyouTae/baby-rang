import type { Metadata } from 'next';
import TemperamentClient from './TemperamentClient';

export const metadata: Metadata = {
  title: '기질 검사',
  description:
    '우리 아이의 타고난 기질을 파악하고 맞춤 양육 힌트를 받아보세요. 신생아·돌 전·돌 후 연령별 30문항 검사.',
  alternates: { canonical: '/temperament' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 기질 검사",
  description:
    "아이의 행동·반응 패턴에 대한 30문항에 답하면 활동성, 규칙성, 접근/회피, 적응성, 반응 강도, 반응 역치, 기분, 주의 산만성, 지속성 등 9가지 차원으로 기질을 분석하여 맞춤 양육 가이드를 제공합니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "아기 기질 분석",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/temperament",
};

export default function TemperamentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TemperamentClient />
    </>
  );
}
