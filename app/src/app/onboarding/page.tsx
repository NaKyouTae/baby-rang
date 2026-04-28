import type { Metadata } from 'next';
import OnboardingClient from './OnboardingClient';

export const metadata: Metadata = {
  title: '회원가입',
  description:
    '아기랑 회원가입 - 닉네임, 역할, 아이 정보를 등록하고 맞춤 육아 서비스를 시작하세요.',
  alternates: { canonical: '/onboarding' },
  robots: { index: true, follow: true },
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
