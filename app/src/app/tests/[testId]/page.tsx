import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TemperamentStartClient from './TemperamentStartClient';
import PlaceholderStartClient from './PlaceholderStartClient';
import type { TestInfo } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

async function getTest(id: string): Promise<TestInfo | null> {
  try {
    const res = await fetch(`${API_URL}/tests/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.test ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ testId: string }>;
}): Promise<Metadata> {
  const { testId } = await params;
  const test = await getTest(testId);
  const title = test?.title ?? '테스트';
  const description = test?.description ?? '아기랑 테스트로 우리 아기를 더 깊이 이해해 보세요.';
  const url = `https://baby-rang.spectrify.kr/tests/${testId}`;
  return {
    title,
    description,
    alternates: { canonical: `/tests/${testId}` },
    openGraph: { title: `${title} | 아기랑`, description, url },
  };
}

export default async function TestStartPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = await getTest(testId);
  if (!test) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: test.title,
    description: test.description ?? undefined,
    provider: { '@type': 'Organization', name: 'Spectrify' },
    areaServed: { '@type': 'Country', name: 'KR' },
    url: `https://baby-rang.spectrify.kr/tests/${testId}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {test.type === 'TEMPERAMENT' ? (
        <TemperamentStartClient test={test} />
      ) : (
        <PlaceholderStartClient test={test} />
      )}
    </>
  );
}
