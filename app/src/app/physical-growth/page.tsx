import type { Metadata } from 'next';
import PhysicalGrowthClient from './PhysicalGrowthClient';

export const metadata: Metadata = {
  title: '성장 측정',
  description:
    '아이의 키, 몸무게, 머리둘레를 기록하고 성장 추이를 확인하세요.',
  alternates: { canonical: '/physical-growth' },
};

export default function PhysicalGrowthPage() {
  return <PhysicalGrowthClient />;
}
