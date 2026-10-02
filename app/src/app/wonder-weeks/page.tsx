import type { Metadata } from 'next';
import Link from 'next/link';
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
  return (
    <>

      <WonderWeeksClient />

      {/* 문서 페이지로 가는 통로. 사이트맵에만 있고 들어오는 링크가 없으면
          크롤러가 고아 페이지로 보고 색인하지 않는다. */}
      <div className="px-5 pb-[calc(var(--bottom-nav-space)+16px)]">
        <Link
          href="/wonder-weeks-guide"
          className="block rounded-[8px] bg-gray-100 px-4 py-3 text-[13px] font-medium text-gray-600 active:bg-gray-200"
        >
          원더윅스 10단계 총정리 보기 →
        </Link>
      </div>
    </>
  );
}
