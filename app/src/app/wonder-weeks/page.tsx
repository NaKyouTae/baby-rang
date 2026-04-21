import type { Metadata } from 'next';
import WonderWeeksClient from './WonderWeeksClient';

export const metadata: Metadata = {
  title: '원더윅스',
  description:
    '아이의 정신 발달 도약기(원더윅스)를 캘린더로 한눈에 확인하세요. 생년월일 기반 자동 계산.',
  alternates: { canonical: '/wonder-weeks' },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 원더윅스",
  description:
    "아기의 정신 발달 도약기(Wonder Weeks)를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기, 각 시기의 특징, 아이가 보이는 행동 변화, 부모의 대처법을 캘린더와 함께 안내합니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "영유아 발달 안내",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/wonder-weeks",
};

export default function WonderWeeksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WonderWeeksClient />
    </>
  );
}
