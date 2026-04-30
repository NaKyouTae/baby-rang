import type { Metadata } from 'next';
import GrowthRecordClient from './GrowthRecordClient';

export const metadata: Metadata = {
  title: '성장 기록',
  description:
    '아기의 키, 몸무게, 머리둘레를 기록하고 성장 추이를 관리하세요. 아기랑 성장 기록 서비스.',
  alternates: { canonical: '/growth-record' },
  openGraph: {
    title: '성장 기록 - 아기 키·몸무게·머리둘레 기록 | 아기랑',
    description:
      '아기의 키, 몸무게, 머리둘레를 날짜별로 기록하고 성장 추이를 관리하세요. WHO 성장 곡선과 자동 비교됩니다.',
    url: 'https://baby-rang.spectrify.kr/growth-record',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 성장 기록",
  description:
    "아기의 키, 몸무게, 머리둘레를 날짜별로 기록하고 성장 추이를 관리합니다. 기록한 데이터는 성장 패턴 분석에서 WHO 성장 곡선과 자동 비교됩니다.",
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
      <section className="sr-only" aria-label="성장 기록 안내">
        <h1>성장 기록 - 아기 키·몸무게·머리둘레 기록</h1>
        <p>
          아기의 키, 몸무게, 머리둘레를 날짜별로 기록하고 성장 추이를 관리하세요.
          기록한 데이터는 성장 패턴 분석에서 WHO 성장 곡선과 자동 비교됩니다.
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>키, 몸무게, 머리둘레 기록 관리</li>
          <li>날짜별 성장 추이 확인</li>
          <li>성장 패턴 분석 연동</li>
          <li>WHO 성장 곡선 자동 비교</li>
        </ul>
      </section>
      <GrowthRecordClient />
    </>
  );
}
