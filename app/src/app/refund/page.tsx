import type { Metadata } from 'next';
import PixelDocPage from '@/components/PixelDocPage';
import RefundContent from '@/components/RefundContent';

export const metadata: Metadata = {
  title: '환불정책',
  description:
    '아기랑 환불정책 - 청약철회, 환불 조건, 정기결제 환불, 환불 신청 방법 및 처리 기간을 안내합니다.',
  alternates: { canonical: '/refund' },
  openGraph: {
    title: '환불정책 | 아기랑',
    description:
      '아기랑 환불정책 - 청약철회, 환불 조건, 정기결제 환불, 환불 신청 방법 및 처리 기간을 안내합니다.',
    url: 'https://baby-rang.spectrify.kr/refund',
  },
};

export default function RefundPage() {
  return (
    <PixelDocPage title="환불정책">
      <RefundContent company="아기랑" />
    </PixelDocPage>
  );
}
