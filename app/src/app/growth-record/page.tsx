import type { Metadata } from 'next';
import GrowthRecordClient from './GrowthRecordClient';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/growth-record`;

export const metadata: Metadata = {
  title: '성장 기록 - 수유·수면·기저귀 육아 기록',
  description:
    '모유수유, 분유, 유축, 이유식, 수면, 기저귀, 목욕, 투약, 체온까지 하루 육아 기록을 간편하게 남기세요.',
  alternates: { canonical: '/growth-record' },
  openGraph: {
    title: '성장 기록 - 수유·수면·기저귀 육아 기록 | 아기랑',
    description:
      '모유수유, 분유, 유축, 이유식, 수면, 기저귀, 목욕, 투약, 체온까지 하루 육아 기록을 간편하게 남기세요.',
    url: PAGE_URL,
  },
};

export default function GrowthRecordPage() {
  return <GrowthRecordClient />;
}
