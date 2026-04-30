import type { Metadata } from 'next';
import WonderWeeksClient from './WonderWeeksClient';

export const metadata: Metadata = {
  title: '원더윅스 캘린더 - 아기 정신 발달 도약기 계산',
  description:
    '아기의 원더윅스(Wonder Weeks) 정신 발달 도약기를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기와 특징, 까다로운 행동 변화, 부모 대처법을 캘린더에서 한눈에 확인하세요.',
  alternates: { canonical: '/wonder-weeks' },
  openGraph: {
    title: '원더윅스 캘린더 - 아기 정신 발달 도약기 계산 | 아기랑',
    description:
      '아기의 원더윅스(Wonder Weeks) 정신 발달 도약기를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기와 특징을 캘린더에서 확인하세요.',
    url: 'https://baby-rang.spectrify.kr/wonder-weeks',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 원더윅스",
  description:
    "아기의 정신 발달 도약기(Wonder Weeks)를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기, 각 시기의 특징, 아기가 보이는 행동 변화, 부모의 대처법을 캘린더와 함께 안내합니다.",
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
      <section className="sr-only" aria-label="원더윅스 안내">
        <h1>원더윅스 캘린더 - 아기 정신 발달 도약기 계산</h1>
        <p>
          아기의 원더윅스(Wonder Weeks) 정신 발달 도약기를 생년월일 기반으로 자동
          계산합니다. 총 10번의 도약기 시기와 특징, 까다로운 행동 변화, 부모 대처법을
          캘린더에서 한눈에 확인하세요.
        </p>
        <h2>원더윅스란?</h2>
        <p>
          원더윅스는 아기가 생후 20개월간 겪는 10번의 정신적 도약기를 설명하는 발달
          이론입니다. 각 도약기마다 아기는 새로운 인지 능력을 획득하며, 보채거나
          수면 패턴이 변할 수 있습니다.
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>생년월일 입력으로 도약기 자동 계산</li>
          <li>현재 도약기 시기 및 특징 안내</li>
          <li>도약기별 아기 행동 변화와 부모 대처법</li>
          <li>캘린더 형태로 시각적 확인</li>
        </ul>
      </section>
      <WonderWeeksClient />
    </>
  );
}
