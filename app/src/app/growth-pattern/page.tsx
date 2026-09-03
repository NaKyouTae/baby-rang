import type { Metadata } from "next";
import GrowthPatternClient from "./GrowthPatternClient";

const SITE_URL = "https://baby-rang.spectrify.kr";
const PAGE_URL = `${SITE_URL}/growth-pattern`;

// 이 화면은 h-[100dvh] + overflow-hidden 고정 레이아웃이라 아래에 본문을 붙여도
// 스크롤로 닿지 않는다. 그래서 여기서는 설명을 sr-only 로 두고,
// 읽을거리(성장곡선·기록법)는 스크롤이 되는 /physical-growth, /growth-record 에서 다룬다.

export const metadata: Metadata = {
  title: "패턴 - 아기 하루 수유·수면 기록 시간대별 차트",
  description:
    "하루 동안의 모유수유, 분유, 유축, 이유식, 수면, 목욕 기록을 시간대별 차트로 한눈에 봅니다. 수유 간격과 수면 리듬이 어떻게 자리잡고 있는지 확인하세요.",
  alternates: { canonical: "/growth-pattern" },
  openGraph: {
    title: "패턴 - 아기 하루 수유·수면 기록 시간대별 차트 | 아기랑",
    description:
      "하루 동안의 모유수유, 분유, 유축, 이유식, 수면, 목욕 기록을 시간대별 차트로 한눈에 봅니다.",
    url: PAGE_URL,
  },
};

const faq = [
  {
    q: "아기랑의 패턴 화면은 무엇을 보여주나요?",
    a: "선택한 날짜 하루 동안 기록한 모유수유, 분유, 유축, 이유식, 수면, 목욕 등을 시간대별 차트로 보여줍니다. 언제 먹고 언제 잤는지가 한눈에 들어와 수유 간격과 수면 리듬을 파악할 수 있습니다.",
  },
  {
    q: "수유 간격과 수면 리듬은 왜 봐야 하나요?",
    a: "아기의 하루 리듬이 일정해지면 다음 수유·수면 시점을 예측할 수 있어 육아가 훨씬 수월해집니다. 반대로 리듬이 갑자기 흐트러지면 성장 급등기나 수면 퇴행기의 신호일 수 있습니다.",
  },
  {
    q: "어떤 기록이 차트에 표시되나요?",
    a: "모유수유, 분유, 유축, 이유식, 수면, 목욕 기록이 표시되며, 보고 싶은 유형만 골라서 볼 수도 있습니다. 기록은 성장 기록 화면에서 추가합니다.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "아기랑 하루 패턴 차트",
    description:
      "하루 동안 기록한 모유수유, 분유, 유축, 이유식, 수면, 목욕을 시간대별 차트로 시각화합니다. 수유 간격과 수면 리듬을 한눈에 파악할 수 있습니다.",
    provider: { "@type": "Organization", name: "Spectrify" },
    serviceType: "영유아 육아 기록 시각화",
    areaServed: { "@type": "Country", name: "KR" },
    url: PAGE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

export default function GrowthPatternPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only" aria-label="패턴 화면 안내">
        <h1>패턴 - 아기 하루 수유·수면 기록 시간대별 차트</h1>
        <p>
          하루 동안 기록한 모유수유, 분유, 유축, 이유식, 수면, 목욕을 시간대별
          차트로 보여줍니다. 언제 먹고 언제 잤는지가 한눈에 들어와 수유 간격과
          수면 리듬이 어떻게 자리잡고 있는지 확인할 수 있습니다.
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>하루 기록을 시간대별 차트로 시각화</li>
          <li>모유수유·분유·유축·이유식·수면·목욕 유형별 필터</li>
          <li>날짜를 이동하며 하루하루 비교</li>
          <li>일간 패턴 요약 차트</li>
        </ul>
        <h2>자주 묻는 질문</h2>
        <dl>
          {faq.map((item) => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <GrowthPatternClient />
    </>
  );
}
