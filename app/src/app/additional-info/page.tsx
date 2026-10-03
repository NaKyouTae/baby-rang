import type { Metadata } from 'next';
import AdditionalInfoClient from './AdditionalInfoClient';

export const metadata: Metadata = {
  title: '추가 정보 확인',
  // 로그인한 회원만 보는 화면이라 색인될 필요가 없다(robots.ts 와 같은 기조).
  robots: { index: false, follow: false },
};

export default function AdditionalInfoPage() {
  return <AdditionalInfoClient />;
}
