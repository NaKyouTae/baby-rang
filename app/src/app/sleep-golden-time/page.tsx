import type { Metadata } from 'next';
import Link from 'next/link';
import SleepGoldenTimeClient from './SleepGoldenTimeClient';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/sleep-golden-time`;

/** 흔히 이야기되는 수면 퇴행 시기 — MONTH_TIPS 에서 해당 월령만 추려 본문에 노출한다. */
const REGRESSION_MONTHS = [4, 8, 12, 18, 24];

export const metadata: Metadata = {
  title: '수면추천 - 우리 아기 오늘 재울 시간',
  description:
    '우리 아기 월령에 맞는 활동 시간과 낮잠·취침 시간을 계산해 오늘 재울 시간을 알려드립니다.',
  alternates: { canonical: '/sleep-golden-time' },
  openGraph: {
    title: '수면추천 - 우리 아기 오늘 재울 시간 | 아기랑',
    description:
      '월령에 맞는 활동 시간으로 오늘 재울 시간을 계산합니다.',
    url: PAGE_URL,
  },
};



export default function SleepGoldenTimePage() {
  return (
    <>

      <SleepGoldenTimeClient />

      {/* 문서 페이지로 가는 통로. 사이트맵에만 있고 들어오는 링크가 없으면
          크롤러가 고아 페이지로 보고 색인하지 않는다. */}
      <div className="px-5 pb-[calc(var(--bottom-nav-space)+16px)]">
        <Link
          href="/sleep-guide"
          className="block rounded-[8px] bg-gray-100 px-4 py-3 text-[13px] font-medium text-gray-600 active:bg-gray-200"
        >
          월령별 수면 가이드 보기 →
        </Link>
      </div>
    </>
  );
}
