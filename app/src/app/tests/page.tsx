import type { Metadata } from 'next';
import TestsClient from './TestsClient';

export const metadata: Metadata = {
  title: '테스트',
  description:
    '우리 아기의 기질, 발달 유형, 유니콘 지수 등 다양한 테스트로 양육에 필요한 인사이트를 받아보세요.',
  alternates: { canonical: '/tests' },
  openGraph: {
    title: '테스트 모음 | 아기랑',
    description:
      '우리 아기의 기질, 발달 유형 등 다양한 테스트로 양육에 필요한 인사이트를 받아보세요.',
    url: 'https://baby-rang.spectrify.kr/tests',
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

type TestItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  linkUrl: string;
  labels: string[];
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  questionCount: number | null;
  sortOrder: number;
  isActive: boolean;
};

async function getTests(): Promise<TestItem[]> {
  try {
    const res = await fetch(`${API_URL}/tests`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.tests) ? data.tests : [];
  } catch {
    return [];
  }
}

export default async function TestsPage() {
  const tests = await getTests();
  return <TestsClient tests={tests} />;
}
