import type { Metadata } from 'next';
import SleepGoldenTimeClient from './SleepGoldenTimeClient';
import { WAKE_WINDOWS, MONTH_TIPS, formatMinutes } from '@/lib/sleepGuide';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/sleep-golden-time`;

/** 흔히 이야기되는 수면 퇴행 시기 — MONTH_TIPS 에서 해당 월령만 추려 본문에 노출한다. */
const REGRESSION_MONTHS = [4, 8, 12, 18, 24];

export const metadata: Metadata = {
  title: '수면추천 - 아기 월령별 낮잠·활동시간·취침시간 가이드',
  description:
    '0~36개월 아기의 월령별 활동 시간(깨어있는 시간), 낮잠 횟수와 길이, 권장 취침 시간을 정리했습니다. 수면 퇴행기 시기와 졸음 신호까지 한눈에 확인하세요.',
  alternates: { canonical: '/sleep-golden-time' },
  openGraph: {
    title: '수면추천 - 아기 월령별 수면 가이드 | 아기랑',
    description:
      '0~36개월 아기의 월령별 활동 시간, 낮잠 횟수와 길이, 권장 취침 시간을 정리했습니다. 수면 퇴행기 시기와 졸음 신호까지 확인하세요.',
    url: PAGE_URL,
  },
};

const faq = [
  {
    q: '활동 시간(깨어있는 시간)이란 무엇인가요?',
    a: '아기가 잠에서 깬 뒤 다음 잠에 들기까지 깨어 있을 수 있는 시간을 말합니다. 영어로는 wake window 라고 합니다. 이 시간을 넘기면 아기가 과각성 상태가 되어 오히려 잠들기 어려워지고, 자주 깨게 됩니다. 월령이 올라갈수록 길어집니다.',
  },
  {
    q: '아기가 졸린 신호는 어떻게 알아채나요?',
    a: '눈을 비비거나 귀를 만지고, 하품을 하며, 먼 곳을 멍하니 응시합니다. 움직임이 둔해지고 칭얼거림이 늘어나기도 합니다. 이 신호가 보일 때 바로 재우는 것이 가장 쉽고, 울기 시작한 뒤에는 이미 늦은 경우가 많습니다.',
  },
  {
    q: '수면 퇴행기는 언제 오나요?',
    a: `보통 ${REGRESSION_MONTHS.join('개월, ')}개월 무렵에 나타납니다. 잘 자던 아기가 갑자기 자주 깨거나 잠들기 어려워하는데, 수면 사이클 변화나 기기·걷기 같은 발달 도약과 함께 오는 일시적인 현상입니다. 대개 2~6주 안에 지나갑니다.`,
  },
  {
    q: '낮잠은 몇 번 재워야 하나요?',
    a: `월령에 따라 다릅니다. ${WAKE_WINDOWS.map((w) => `${w.label} ${w.napCount}회`).join(', ')} 가 일반적인 기준입니다. 다만 아기마다 편차가 있으므로 횟수보다 총 수면 시간과 아기의 컨디션을 함께 보는 것이 좋습니다.`,
  },
  {
    q: '취침 시간은 몇 시가 좋나요?',
    a: `월령별로 ${WAKE_WINDOWS[0].bedtimeMin}~${WAKE_WINDOWS[WAKE_WINDOWS.length - 1].bedtimeMax} 사이가 권장됩니다. 어릴수록 이른 취침이 좋습니다. 늦게 재우면 더 오래 잘 것 같지만, 실제로는 과각성으로 잠들기 어려워지고 밤에 더 자주 깨는 경우가 많습니다.`,
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '아기 월령별 수면 가이드 - 활동시간·낮잠·취침시간 총정리',
    description:
      '0~36개월 아기의 월령별 활동 시간, 낮잠 횟수와 길이, 권장 취침 시간, 수면 퇴행기 시기를 정리했습니다.',
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

export default function SleepGoldenTimePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SleepGoldenTimeClient />

      {/* 검색·AI 가 읽을 본문. 계산기만으로는 월령별 기준이 HTML 에 남지 않는다.
          아래 내용과 계산기는 @/lib/sleepGuide 를 함께 참조한다. */}
      <article className="border-t border-gray-200 bg-gray-100 px-5 pt-8 pb-[calc(var(--bottom-nav-space)+32px)]">
        <h1 className="text-[20px] font-bold leading-snug text-app-black">
          아기 월령별 수면 가이드 - 활동시간·낮잠·취침시간
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          아기를 잘 재우는 핵심은 <strong className="text-app-black">활동 시간
          (깨어있는 시간)</strong>입니다. 잠에서 깬 뒤 다음 잠까지 깨어 있을 수
          있는 시간이 월령마다 정해져 있는데, 이 시간을 넘기면 아기가 과각성
          상태가 되어 오히려 잠들기 어려워집니다. 아래 기준으로 하루 일과를
          맞춰보세요.
        </p>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          월령별 수면 기준표
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-white">
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
                  월령
                </th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
                  활동 시간
                </th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
                  낮잠
                </th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-app-black">
                  취침 시간
                </th>
              </tr>
            </thead>
            <tbody>
              {WAKE_WINDOWS.map((w) => (
                <tr key={w.label} className="bg-white">
                  <td className="border border-gray-200 px-2 py-2 font-medium text-app-black">
                    {w.label}
                  </td>
                  <td className="border border-gray-200 px-2 py-2 text-gray-600">
                    {formatMinutes(w.wakeMin)}~{formatMinutes(w.wakeMax)}
                  </td>
                  <td className="border border-gray-200 px-2 py-2 text-gray-600">
                    {w.napCount}회 · {formatMinutes(w.napDurMin)}~
                    {formatMinutes(w.napDurMax)}
                  </td>
                  <td className="border border-gray-200 px-2 py-2 text-gray-600">
                    {w.bedtimeMin}~{w.bedtimeMax}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          월령 구간별 포인트
        </h2>
        <ul className="mt-2 flex flex-col gap-2">
          {WAKE_WINDOWS.map((w) => (
            <li
              key={w.label}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <h3 className="text-[14px] font-semibold text-app-black">
                {w.label}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
                {w.tip}
              </p>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          수면 퇴행기가 오는 시기
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
          잘 자던 아기가 갑자기 자주 깨는 시기가 있습니다. 발달 도약과 함께 오는
          일시적인 현상이라 대개 2~6주 안에 지나갑니다.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {REGRESSION_MONTHS.filter((m) => MONTH_TIPS[m]).map((m) => (
            <li
              key={m}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <h3 className="text-[14px] font-semibold text-app-black">
                {m}개월
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
                {MONTH_TIPS[m]}
              </p>
            </li>
          ))}
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
          위 수치는 일반적인 기준이며 아기마다 편차가 큽니다. 수면 문제가 오래
          이어지거나 성장·발달에 걱정이 있다면 소아청소년과 전문의와 상담하세요.
        </p>
      </article>
    </>
  );
}
