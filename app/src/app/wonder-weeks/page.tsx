import type { Metadata } from 'next';
import WonderWeeksClient from './WonderWeeksClient';
import { WONDER_WEEKS_LEAPS, weekToMonthLabel } from '@/lib/wonderWeeks';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/wonder-weeks`;

export const metadata: Metadata = {
  title: '원더윅스 캘린더 - 아기 정신 발달 도약기 계산',
  description:
    '아기의 원더윅스(Wonder Weeks) 정신 발달 도약기를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기와 특징, 까다로운 행동 변화, 부모 대처법을 캘린더에서 한눈에 확인하세요.',
  alternates: { canonical: '/wonder-weeks' },
  openGraph: {
    title: '원더윅스 캘린더 - 아기 정신 발달 도약기 계산 | 아기랑',
    description:
      '아기의 원더윅스(Wonder Weeks) 정신 발달 도약기를 생년월일 기반으로 자동 계산합니다. 총 10번의 도약기 시기와 특징을 캘린더에서 확인하세요.',
    url: PAGE_URL,
  },
};

const faq = [
  {
    q: '원더윅스란 무엇인가요?',
    a: '원더윅스(Wonder Weeks)는 아기가 생후 20개월 동안 겪는 10번의 정신 발달 도약기를 말합니다. 도약기마다 아기는 세상을 인식하는 새로운 능력을 얻는데, 그 변화에 아기 스스로 적응하는 동안 평소보다 많이 울고 보채며 잠을 설치게 됩니다. 발달이 잘 되고 있다는 신호에 가깝습니다.',
  },
  {
    q: '원더윅스는 언제 오나요?',
    a: `출생일(예정일이 아닌 실제 출산일이 아니라 출산 예정일 기준으로 계산하는 것이 원칙입니다)로부터 ${WONDER_WEEKS_LEAPS.map((l) => `${l.startWeek}~${l.endWeek}주`).join(', ')}에 각각 찾아옵니다. 총 10번이며, 뒤로 갈수록 기간이 길어집니다.`,
  },
  {
    q: '원더윅스 시기에 나타나는 대표적인 신호는 무엇인가요?',
    a: '흔히 3C 라고 부르는 세 가지가 함께 나타납니다. 평소보다 많이 우는 것(Crying), 부모에게서 떨어지지 않으려는 것(Clinginess), 이유 없이 짜증이 늘어나는 것(Crankiness) 입니다. 여기에 수면 퇴행과 식욕 변화가 동반되는 경우가 많습니다.',
  },
  {
    q: '원더윅스는 조산아도 같은 시기에 오나요?',
    a: '아니요. 원더윅스는 뇌 발달을 기준으로 하므로 출생일이 아니라 출산 예정일을 기준으로 계산합니다. 조산아라면 예정일 기준의 교정 연령으로 보아야 시기가 맞습니다.',
  },
  {
    q: '원더윅스 기간에는 어떻게 해야 하나요?',
    a: '새로운 훈련을 시작하기보다 기존 루틴을 지키는 것이 우선입니다. 수면 교육이나 이유식 진행처럼 아기에게 부담이 되는 변화는 도약기가 지난 뒤로 미루고, 스킨십과 안정적인 반응을 늘려 주세요. 도약기는 보통 1~6주 안에 지나갑니다.',
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '원더윅스 캘린더 - 아기 정신 발달 도약기 10번 총정리',
    description:
      '생후 20개월간 찾아오는 원더윅스 10번의 도약기 시기, 아기에게 나타나는 변화, 부모의 대처법을 정리했습니다.',
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

export default function WonderWeeksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <WonderWeeksClient />

      {/* 검색·AI 가 읽을 본문. 캘린더는 계산 도구일 뿐이라 도약기 내용 자체가
          HTML 에 없었다. 아래 내용과 캘린더는 @/lib/wonderWeeks 를 함께 참조한다. */}
      <article className="border-t border-gray-200 bg-gray-100 px-6 pt-8 pb-[calc(var(--bottom-nav-space)+32px)]">
        <h1 className="text-[20px] font-bold leading-snug text-app-black">
          원더윅스 - 아기 정신 발달 도약기 10번 총정리
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          원더윅스(Wonder Weeks)는 아기가 생후 20개월 동안 겪는 10번의 정신 발달
          도약기를 말합니다. 도약기마다 아기는 세상을 인식하는 새로운 능력을
          얻는데, 그 변화에 스스로 적응하는 동안 평소보다 많이 울고 보채며 잠을
          설치게 됩니다. 힘든 시기지만 발달이 잘 진행되고 있다는 신호에
          가깝습니다.
        </p>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          도약기의 대표 신호 3가지
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-relaxed text-gray-600">
          <li>
            <strong className="text-app-black">많이 웁니다</strong> — 달래도
            쉽게 그치지 않고, 이유를 찾기 어려운 울음이 늘어납니다.
          </li>
          <li>
            <strong className="text-app-black">떨어지지 않으려 합니다</strong> —
            안겨 있으려 하고, 부모가 잠깐 자리를 비워도 불안해합니다.
          </li>
          <li>
            <strong className="text-app-black">짜증이 늘어납니다</strong> — 잘
            놀던 장난감에도 금세 신경질을 내고 수면·식사 리듬이 흔들립니다.
          </li>
        </ul>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          원더윅스 10번의 도약기
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
          아래 주차는 출산 예정일을 기준으로 합니다. 조산아라면 실제 출생일이
          아니라 예정일로 계산해야 시기가 맞습니다.
        </p>

        <ol className="mt-3 flex flex-col gap-3">
          {WONDER_WEEKS_LEAPS.map((leap) => (
            <li
              key={leap.leap}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <h3 className="text-[15px] font-semibold text-app-black">
                {leap.leap}차 도약기 · {leap.name}
              </h3>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {leap.startWeek}~{leap.endWeek}주 ({weekToMonthLabel(leap.startWeek)}{' '}
                무렵)
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                <strong className="text-app-black">이런 변화가 있어요</strong>
                <br />
                {leap.symptom}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                <strong className="text-app-black">이렇게 해보세요</strong>
                <br />
                {leap.tip}
              </p>
            </li>
          ))}
        </ol>

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
          원더윅스는 아기의 발달 경향을 이해하기 위한 참고 자료입니다. 발달
          속도는 아기마다 다르며, 수유 거부나 지속적인 수면 문제 등 걱정되는
          증상이 이어진다면 소아청소년과 전문의와 상담하세요.
        </p>
      </article>
    </>
  );
}
