import type { Metadata } from 'next';
import WonderWeeksClient from './WonderWeeksClient';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/wonder-weeks`;

export const metadata: Metadata = {
  title: '원더윅스 - 우리 아기 도약기 확인',
  description:
    '우리 아기가 지금 몇 번째 원더윅스 도약기에 있는지 생년월일로 바로 확인하세요.',
  alternates: { canonical: '/wonder-weeks' },
  openGraph: {
    title: '원더윅스 - 우리 아기 도약기 확인 | 아기랑',
    description:
      '생년월일로 지금 도약기 시기를 확인하세요.',
    url: PAGE_URL,
  },
};

export default function WonderWeeksPage() {
  return <WonderWeeksClient />;
}
