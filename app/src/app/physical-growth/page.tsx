import type { Metadata } from 'next';
import PhysicalGrowthClient from './PhysicalGrowthClient';
import { getGrowthStandard, type Gender, type MetricType } from './growthStandards';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/physical-growth`;

/** 본문 표에 실을 월령. 0~36개월 전부는 너무 길어 주요 시점만 추린다. */
const TABLE_MONTHS = [0, 1, 2, 3, 6, 9, 12, 18, 24, 30, 36];

export const metadata: Metadata = {
  title: '성장 측정 - 개월별 표준 키·몸무게와 백분위',
  description:
    '0~36개월 남아·여아의 개월별 표준 키, 몸무게, 머리둘레를 백분위(3·50·97)로 정리했습니다. 우리 아기 측정값을 기록하고 또래 대비 위치를 확인하세요.',
  alternates: { canonical: '/physical-growth' },
  openGraph: {
    title: '성장 측정 - 개월별 표준 키·몸무게와 백분위 | 아기랑',
    description:
      '0~36개월 남아·여아의 개월별 표준 키, 몸무게, 머리둘레를 백분위로 정리했습니다.',
    url: PAGE_URL,
  },
};

const faq = [
  {
    q: '성장 백분위란 무엇인가요?',
    a: '같은 개월 수, 같은 성별의 아기 100명을 작은 순서대로 세웠을 때 우리 아기가 몇 번째에 있는지를 나타내는 값입니다. 50 백분위가 딱 중간이고, 25 백분위라면 100명 중 25번째로 작다는 뜻입니다. 3~97 백분위 사이면 정상 범위로 봅니다.',
  },
  {
    q: '백분위가 낮으면 문제가 있는 건가요?',
    a: '한 시점의 숫자보다 곡선의 흐름이 중요합니다. 10 백분위라도 그 선을 따라 꾸준히 자라고 있다면 대개 문제가 없습니다. 반대로 50 백분위였다가 여러 차례에 걸쳐 3 백분위 쪽으로 계속 떨어진다면 진료를 받아보는 것이 좋습니다.',
  },
  {
    q: '기준이 되는 성장 도표는 무엇인가요?',
    a: '2017 소아청소년 성장도표를 사용합니다. 0~36개월 구간은 WHO Growth Standards 를 따릅니다. 모유수유아를 기준으로 만들어진 국제 표준입니다.',
  },
  {
    q: '측정은 얼마나 자주 하는 게 좋나요?',
    a: '생후 1년까지는 한 달에 한 번, 이후에는 2~3개월에 한 번 정도가 적당합니다. 영유아 건강검진 일정에 맞춰 기록하면 놓치지 않습니다.',
  },
  {
    q: '머리둘레는 왜 재나요?',
    a: '머리둘레는 뇌 성장을 반영하는 지표라 특히 24개월 이전에 중요합니다. 갑자기 커지거나 성장이 멈추면 확인이 필요하므로 키·몸무게와 함께 기록하는 것이 좋습니다.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '개월별 아기 표준 키·몸무게·머리둘레와 백분위 보는 법',
    description:
      '0~36개월 남아·여아의 개월별 표준 키, 몸무게, 머리둘레를 백분위로 정리하고 백분위 해석법을 설명합니다.',
    inLanguage: 'ko-KR',
    mainEntityOfPage: PAGE_URL,
    author: { '@type': 'Organization', name: 'Spectrify' },
    publisher: {
      '@type': 'Organization',
      name: 'Spectrify',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  },
];

function StandardTable({
  gender,
  metric,
}: {
  gender: Gender;
  metric: MetricType;
}) {
  const std = getGrowthStandard(gender, metric);
  const rows = TABLE_MONTHS.map((m) => std.data.find((d) => d.month === m)).filter(
    (d): d is NonNullable<typeof d> => Boolean(d),
  );

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[380px] border-collapse text-[13px]">
        <caption className="sr-only">
          {gender === 'male' ? '남아' : '여아'} 개월별 표준 {std.label} (
          {std.unit})
        </caption>
        <thead>
          <tr className="bg-white">
            <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
              개월
            </th>
            <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
              3%
            </th>
            <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
              50% (평균)
            </th>
            <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
              97%
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.month} className="bg-white">
              <td className="border border-gray-200 px-2 py-2 font-medium text-app-black">
                {d.month}개월
              </td>
              <td className="border border-gray-200 px-2 py-2 text-gray-600">
                {d.percentiles.p3}
                {std.unit}
              </td>
              <td className="border border-gray-200 px-2 py-2 font-medium text-gray-600">
                {d.percentiles.p50}
                {std.unit}
              </td>
              <td className="border border-gray-200 px-2 py-2 text-gray-600">
                {d.percentiles.p97}
                {std.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PhysicalGrowthPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PhysicalGrowthClient />

      {/* 검색·AI 가 읽을 본문. 차트는 SVG 라 HTML 에 수치가 남지 않으므로
          같은 기준 데이터(growthStandards)를 표로도 렌더한다. */}
      <article className="border-t border-gray-200 bg-gray-100 px-5 pt-8 pb-[calc(var(--bottom-nav-space)+32px)]">
        <h1 className="text-[20px] font-bold leading-snug text-app-black">
          개월별 아기 표준 키·몸무게와 백분위 보는 법
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          아래 수치는 <strong className="text-app-black">2017 소아청소년
          성장도표</strong>(0~36개월은 WHO Growth Standards) 기준입니다.
          백분위는 같은 개월 수, 같은 성별 아기 100명을 작은 순서로 세웠을 때 우리
          아기가 몇 번째인지를 뜻합니다. 50%가 중간값이고,{' '}
          <strong className="text-app-black">3%~97% 사이면 정상 범위</strong>로
          봅니다.
        </p>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          남아 개월별 표준 몸무게
        </h2>
        <StandardTable gender="male" metric="weight" />

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          여아 개월별 표준 몸무게
        </h2>
        <StandardTable gender="female" metric="weight" />

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          남아 개월별 표준 키
        </h2>
        <StandardTable gender="male" metric="height" />

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          여아 개월별 표준 키
        </h2>
        <StandardTable gender="female" metric="height" />

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          백분위, 이렇게 읽으세요
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-relaxed text-gray-600">
          <li>
            <strong className="text-app-black">숫자보다 흐름</strong> — 10%라도
            그 선을 따라 꾸준히 자라면 대개 괜찮습니다.
          </li>
          <li>
            <strong className="text-app-black">곡선을 가로지를 때 주의</strong> —
            50%에서 여러 차례에 걸쳐 3% 쪽으로 계속 내려가면 진료를 받아보세요.
          </li>
          <li>
            <strong className="text-app-black">키와 몸무게를 함께</strong> — 둘의
            균형이 영양 상태를 보여줍니다.
          </li>
          <li>
            <strong className="text-app-black">머리둘레는 24개월 이전에 특히
            중요</strong> — 뇌 성장을 반영하는 지표입니다.
          </li>
          <li>
            <strong className="text-app-black">조산아는 교정 연령으로</strong> —
            출생일이 아니라 출산 예정일 기준으로 봐야 합니다.
          </li>
        </ul>

        <h2 className="mt-8 text-[16px] font-bold text-app-black">
          자주 묻는 질문
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {faq.map((item) => (
            <details
              key={item.q}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <summary className="cursor-pointer text-[14px] font-medium text-app-black">
                {item.q}
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-gray-500">
          위 수치는 참고 기준입니다. 성장에 대한 판단은 여러 시점의 기록과 진찰을
          함께 보아야 하므로, 걱정되는 부분이 있다면 소아청소년과 전문의와
          상담하세요.
        </p>
      </article>
    </>
  );
}
