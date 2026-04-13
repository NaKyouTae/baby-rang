import type { Metadata } from 'next';
import SleepGoldenTimeClient from './SleepGoldenTimeClient';

export const metadata: Metadata = {
  title: '수면 골든타임',
  description:
    '아이의 월령에 맞는 낮잠 횟수, 활동 시간, 밤잠 추천 시간을 확인하세요. 수면추천으로 건강한 수면 습관을 만들어요.',
  alternates: { canonical: '/sleep-golden-time' },
};

export default function SleepGoldenTimePage() {
  return <SleepGoldenTimeClient />;
}
