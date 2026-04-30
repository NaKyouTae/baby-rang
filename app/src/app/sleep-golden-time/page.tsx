import type { Metadata } from 'next';
import SleepGoldenTimeClient from './SleepGoldenTimeClient';

export const metadata: Metadata = {
  title: '수면 골든타임',
  description:
    '아기의 월령에 맞는 낮잠 횟수, 활동 시간, 밤잠 추천 시간을 확인하세요. 수면추천으로 건강한 수면 습관을 만들어요.',
  alternates: { canonical: '/sleep-golden-time' },
  openGraph: {
    title: '수면 골든타임 - 아기 월령별 수면 가이드 | 아기랑',
    description:
      '아기의 월령에 맞는 낮잠 횟수, 활동 시간, 밤잠 추천 시간을 확인하세요. 수면 골든타임으로 건강한 수면 습관을 만들어요.',
    url: 'https://baby-rang.spectrify.kr/sleep-golden-time',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 수면 골든타임",
  description:
    "아기의 월령에 맞는 최적의 낮잠 횟수, 활동 시간(깨어있는 시간), 밤잠 권장 시간을 계산합니다. 수면 골든타임을 지키면 아기의 건강한 수면 습관 형성에 도움이 됩니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "영유아 수면 가이드",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/sleep-golden-time",
};

export default function SleepGoldenTimePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only" aria-label="수면 골든타임 안내">
        <h1>수면 골든타임 - 아기 월령별 수면 가이드</h1>
        <p>
          아기의 월령에 맞는 낮잠 횟수, 활동 시간, 밤잠 추천 시간을 확인하세요.
          수면 골든타임을 지키면 아기의 건강한 수면 습관 형성에 도움이 됩니다.
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>월령별 최적 낮잠 횟수 안내</li>
          <li>권장 활동 시간(깨어있는 시간) 계산</li>
          <li>밤잠 추천 시간대 제공</li>
          <li>수면 스케줄 시각화</li>
        </ul>
      </section>
      <SleepGoldenTimeClient />
    </>
  );
}
