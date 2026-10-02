import type { Metadata } from 'next';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/settings/faq`;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export const metadata: Metadata = {
  title: '자주 묻는 질문',
  description:
    '아기랑 이용 중 자주 받는 질문을 모았습니다. 기질 검사, 성장 기록, 결제와 환불, 계정 관련 궁금한 점을 확인하세요.',
  alternates: { canonical: '/settings/faq' },
  openGraph: {
    title: '자주 묻는 질문 | 아기랑',
    description:
      '아기랑 이용 중 자주 받는 질문을 모았습니다. 기질 검사, 성장 기록, 결제와 환불, 계정 관련 궁금한 점을 확인하세요.',
    url: PAGE_URL,
  },
};

interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

/**
 * 어드민에 등록된 공개 FAQ 를 가져온다.
 *
 * 서버가 죽어 있어도 페이지는 떠야 하므로 실패는 빈 목록으로 삼킨다.
 * 10분 재검증 — 어드민에서 고친 내용이 그 안에 반영된다.
 */
async function getFaqs(): Promise<Faq[]> {
  try {
    const res = await fetch(`${API_URL}/faqs`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { faqs?: Faq[] };
    return data.faqs ?? [];
  } catch {
    return [];
  }
}

/** 서버가 정렬해 준 순서를 유지한 채 분류별로 묶는다. */
function groupByCategory(faqs: Faq[]): Array<[string, Faq[]]> {
  const groups = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const list = groups.get(faq.category);
    if (list) list.push(faq);
    else groups.set(faq.category, [faq]);
  }
  return [...groups.entries()];
}

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = groupByCategory(faqs);

  // FAQPage 구조화 데이터 — AI 검색 엔진과 구글이 질문·답변 쌍을 그대로 읽는다.
  // 본문과 같은 데이터에서 만들어야 신뢰할 수 있으므로 여기서 함께 생성한다.
  const faqLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          url: PAGE_URL,
          inLanguage: 'ko-KR',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null;

  return (
    <div
      className="flex flex-col bg-white"
      style={{ paddingBottom: 'calc(var(--bottom-nav-space) + 40px)' }}
    >
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <PageHeader title="자주 묻는 질문" variant="back" />

      <div className="px-5 pt-5 flex flex-col gap-6">
        {groups.length === 0 ? (
          <p className="text-[14px] leading-relaxed" style={{ color: palette.gray500 }}>
            등록된 질문이 아직 없어요.
          </p>
        ) : (
          groups.map(([category, items]) => (
            <section key={category} className="flex flex-col gap-2">
              <h2
                className="text-[12px] font-medium"
                style={{ color: palette.gray500 }}
              >
                {category}
              </h2>

              {items.map((faq) => (
                /* details/summary 는 자바스크립트 없이 펼쳐진다.
                   AI 크롤러는 JS 를 실행하지 않으므로 답변이 HTML 에 그대로 있어야 한다. */
                <details
                  key={faq.id}
                  className="rounded-[12px] px-4 py-3.5"
                  style={{
                    backgroundColor: palette.gray100,
                    border: `1px solid ${palette.gray200}`,
                  }}
                >
                  <summary className="cursor-pointer list-none text-[15px] font-medium text-app-black">
                    {faq.question}
                  </summary>
                  <p
                    className="mt-3 whitespace-pre-line text-[14px] leading-relaxed"
                    style={{ color: palette.gray600 }}
                  >
                    {faq.answer}
                  </p>
                </details>
              ))}
            </section>
          ))
        )}

        <p className="text-[12px] leading-relaxed" style={{ color: palette.gray500 }}>
          찾는 답변이 없다면 마이페이지의 문의하기로 알려주세요.
        </p>
      </div>
    </div>
  );
}
