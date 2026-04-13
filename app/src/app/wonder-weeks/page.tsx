import type { Metadata } from 'next';
import WonderWeeksClient from './WonderWeeksClient';

export const metadata: Metadata = {
  title: '원더윅스',
  description:
    '아이의 정신 발달 도약기(원더윅스)를 캘린더로 한눈에 확인하세요. 생년월일 기반 자동 계산.',
  alternates: { canonical: '/wonder-weeks' },
};

export default function WonderWeeksPage() {
  return <WonderWeeksClient />;
}
