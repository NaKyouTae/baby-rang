import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: '로그인',
  description: '카카오, 네이버 또는 Apple 계정으로 아기랑을 시작하세요.',
  // 로그인 수단만 있는 얇은 페이지라 색인될 이유가 없다.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
