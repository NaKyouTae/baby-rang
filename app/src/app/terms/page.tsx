import type { Metadata } from 'next';
import PixelDocPage from '@/components/PixelDocPage';
import TermsContent from '@/components/TermsContent';

export const metadata: Metadata = {
  title: '이용약관',
  description:
    '아기랑 이용약관 - 서비스 이용 조건, 회원의 권리와 의무, 유료 서비스 및 결제, 계약 해지 등을 안내합니다.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: '이용약관 | 아기랑',
    description:
      '아기랑 이용약관 - 서비스 이용 조건, 회원의 권리와 의무, 유료 서비스 및 결제, 계약 해지 등을 안내합니다.',
    url: 'https://baby-rang.spectrify.kr/terms',
  },
};

export default function TermsPage() {
  return (
    <PixelDocPage title="이용약관">
      <TermsContent company="아기랑" />
    </PixelDocPage>
  );
}
