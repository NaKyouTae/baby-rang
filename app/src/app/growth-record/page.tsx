import type { Metadata } from 'next';
import GrowthRecordClient from './GrowthRecordClient';

export const metadata: Metadata = {
  title: '성장 기록',
  description:
    '아이의 키, 몸무게, 머리둘레를 기록하고 성장 추이를 관리하세요. 아기랑 성장 기록 서비스.',
  alternates: { canonical: '/growth-record' },
};

export default function GrowthRecordPage() {
  return <GrowthRecordClient />;
}
