import type { Metadata } from 'next';
import GrowthRecordClient from './GrowthRecordClient';
import { TYPE_CONFIG } from './types';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/growth-record`;

/** 본문에 노출할 기록 항목 — 실제 기록 화면(TYPE_CONFIG)과 같은 출처를 쓴다. */
const RECORD_TYPES = Object.values(TYPE_CONFIG).map((c) => c.label);

export const metadata: Metadata = {
  title: '성장 기록 - 수유·수면·기저귀 육아 기록',
  description:
    '모유수유, 분유, 유축, 이유식, 수면, 기저귀, 목욕, 투약, 체온까지 하루 육아 기록을 간편하게 남기세요. 신생아 수유 간격과 기저귀 횟수 기준도 함께 정리했습니다.',
  alternates: { canonical: '/growth-record' },
  openGraph: {
    title: '성장 기록 - 수유·수면·기저귀 육아 기록 | 아기랑',
    description:
      '모유수유, 분유, 유축, 이유식, 수면, 기저귀, 목욕, 투약, 체온까지 하루 육아 기록을 간편하게 남기세요.',
    url: PAGE_URL,
  },
};

const faq = [
  {
    q: '신생아 수유 간격은 어느 정도가 정상인가요?',
    a: '생후 1개월까지는 보통 2~3시간 간격으로 하루 8~12회 수유합니다. 모유수유는 분유보다 소화가 빨라 간격이 더 짧을 수 있습니다. 시간에 맞추기보다 아기가 보내는 배고픔 신호(입을 오물거림, 손을 빨기)에 맞춰 먹이는 것이 좋습니다.',
  },
  {
    q: '기저귀는 하루 몇 번 갈아야 정상인가요?',
    a: '생후 1주 이후 신생아는 하루 소변 6회 이상이면 충분히 먹고 있다는 신호입니다. 대변 횟수는 편차가 큽니다. 모유수유아는 하루 여러 번 볼 수도, 며칠에 한 번 볼 수도 있는데 아기가 편안하고 변이 무르다면 문제없습니다.',
  },
  {
    q: '육아 기록은 언제까지 하는 게 좋나요?',
    a: '수유 간격과 수면 리듬이 자리잡는 생후 6개월 무렵까지가 가장 도움이 됩니다. 이후에는 이유식 진행이나 투약·체온처럼 필요한 항목만 남겨도 충분합니다.',
  },
  {
    q: '기록을 배우자와 함께 볼 수 있나요?',
    a: '초대 코드로 그룹에 배우자나 조부모를 초대하면 같은 아기의 기록을 함께 보고 남길 수 있습니다. 누가 기록했는지도 함께 표시됩니다.',
  },
  {
    q: '어떤 항목을 기록할 수 있나요?',
    a: `${RECORD_TYPES.join(', ')} 등 ${RECORD_TYPES.length}가지를 기록할 수 있습니다. 자주 쓰는 항목은 홈 화면 퀵 버튼으로 꺼내 둘 수 있습니다.`,
  },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: '신생아 육아 기록 - 수유 간격·기저귀 횟수 기준과 기록법',
    description:
      '모유수유, 분유, 수면, 기저귀 등 하루 육아 기록을 남기는 방법과 신생아 수유 간격·기저귀 횟수의 일반적인 기준을 정리했습니다.',
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

export default function GrowthRecordPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <GrowthRecordClient />

      {/* 검색·AI 가 읽을 본문. 기록 화면 자체는 로그인·아기 등록 이후에만
          내용이 차므로, 기준 정보를 HTML 로 남긴다. */}
      <article className="border-t border-gray-200 bg-gray-100 px-5 pt-8 pb-[calc(var(--bottom-nav-space)+32px)]">
        <h1 className="text-[20px] font-bold leading-snug text-app-black">
          신생아 육아 기록 - 수유 간격·기저귀 횟수 기준
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          아기가 언제 먹고 언제 잤는지 기록해두면 하루 리듬이 눈에 보입니다.
          수유 간격과 수면 패턴이 자리잡는 시점을 알 수 있고, 병원 진료나 영유아
          검진에서 설명하기도 훨씬 수월해집니다.
        </p>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          기록할 수 있는 {RECORD_TYPES.length}가지 항목
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {RECORD_TYPES.map((label) => (
            <li
              key={label}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-app-black"
            >
              {label}
            </li>
          ))}
        </ul>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          알아두면 좋은 기준
        </h2>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-gray-600">
          <li>
            <strong className="text-app-black">수유 간격</strong> — 생후 1개월까지
            2~3시간 간격, 하루 8~12회가 일반적입니다. 모유는 소화가 빨라 간격이 더
            짧을 수 있습니다.
          </li>
          <li>
            <strong className="text-app-black">기저귀</strong> — 생후 1주 이후
            소변 하루 6회 이상이면 충분히 먹고 있다는 신호입니다. 대변 횟수는
            편차가 큽니다.
          </li>
          <li>
            <strong className="text-app-black">수면</strong> — 신생아는 하루
            14~17시간을 자며 낮밤 구분이 없습니다. 생후 2~3개월부터 리듬이
            잡히기 시작합니다.
          </li>
          <li>
            <strong className="text-app-black">체온</strong> — 정상 범위는
            36.5~37.5℃ 입니다. 생후 3개월 미만 아기가 38℃ 이상이면 바로 진료를
            받아야 합니다.
          </li>
          <li>
            <strong className="text-app-black">이유식</strong> — 보통 생후
            4~6개월에 시작합니다. 새 재료는 3일 간격으로 하나씩 더해 알레르기
            반응을 확인하세요.
          </li>
        </ul>

        <h2 className="mt-6 text-[16px] font-bold text-app-black">
          기록을 이어가는 요령
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-relaxed text-gray-600">
          <li>모두 적으려 하지 말고 수유·수면·기저귀 세 가지부터 시작하세요.</li>
          <li>자주 쓰는 항목은 퀵 버튼으로 꺼내두면 두 번의 터치로 끝납니다.</li>
          <li>
            배우자·조부모를 그룹에 초대하면 같은 아기의 기록을 함께 남길 수
            있습니다.
          </li>
          <li>
            며칠 빠뜨려도 괜찮습니다. 완벽한 기록보다 이어가는 것이 중요합니다.
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
          위 기준은 일반적인 참고 범위이며 아기마다 편차가 큽니다. 수유량 부족,
          발열, 탈수 증상 등이 의심되면 소아청소년과 전문의와 상담하세요.
        </p>
      </article>
    </>
  );
}
