import type { Metadata } from 'next';
import TemperamentClient from './TemperamentClient';

export const metadata: Metadata = {
  title: '기질 검사',
  description:
    '우리 아이의 타고난 기질을 파악하고 맞춤 양육 힌트를 받아보세요. 신생아·돌 전·돌 후 연령별 30문항 검사.',
  alternates: { canonical: '/temperament' },
};

export default function TemperamentPage() {
  return <TemperamentClient />;
}
