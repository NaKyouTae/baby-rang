import type { Metadata } from 'next';
import GrowthRecordClient from './GrowthRecordClient';

export const metadata: Metadata = {
  title: '성장 기록',
  description:
    '아이의 키, 몸무게, 머리둘레를 기록하고 성장 추이를 관리하세요. 아기랑 성장 기록 서비스.',
  alternates: { canonical: '/growth-record' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 성장 기록",
  description:
    "아이의 키, 몸무게, 머리둘레를 날짜별로 기록하고 성장 추이를 관리합니다. 기록한 데이터는 성장 패턴 분석에서 WHO 성장 곡선과 자동 비교됩니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "영유아 성장 기록",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/growth-record",
};

export default function GrowthRecordPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GrowthRecordClient />
    </>
  );
}
