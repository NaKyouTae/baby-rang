import type { Metadata } from 'next';
import PhysicalGrowthClient from './PhysicalGrowthClient';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/physical-growth`;

export const metadata: Metadata = {
  title: '성장 측정 - 우리 아기 키·몸무게 기록',
  description:
    '우리 아기의 키, 몸무게, 머리둘레를 기록하고 WHO 성장 곡선과 비교해 또래 중 위치를 확인하세요.',
  alternates: { canonical: '/physical-growth' },
  openGraph: {
    title: '성장 측정 - 우리 아기 키·몸무게 기록 | 아기랑',
    description:
      '측정값을 기록하고 또래 대비 백분위를 확인하세요.',
    url: PAGE_URL,
  },
};

export default function PhysicalGrowthPage() {
  return <PhysicalGrowthClient />;
}
