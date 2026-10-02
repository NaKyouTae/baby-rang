import type { Metadata } from 'next';
import Link from 'next/link';
import PhysicalGrowthClient from './PhysicalGrowthClient';

const SITE_URL = 'https://baby-rang.spectrify.kr';
const PAGE_URL = `${SITE_URL}/physical-growth`;

/** 본문 표에 실을 월령. 0~36개월 전부는 너무 길어 주요 시점만 추린다. */

export const metadata: Metadata = {
  title: '성장 측정 - 우리 아기 키·몸무게 기록',
  description:
    '우리 아기의 키, 몸무게, 머리둘레를 기록하고 WHO 성장 곡선과 비교해 또래 중 위치를 확인하세요.',
  alternates: { canonical: '/physical-growth' },
  openGraph: {
    title: '성장 측정 - 우리 아기 키·몸무게 기록 | 아기랑',
    description:
      '측정값을 기록하고 또래 대비 백분위를 확인하세요.',
    url: PAGE_URL,
  },
};




export default function PhysicalGrowthPage() {
  return (
    <>

      <PhysicalGrowthClient />

      {/* 문서 페이지로 가는 통로. 사이트맵에만 있고 들어오는 링크가 없으면
          크롤러가 고아 페이지로 보고 색인하지 않는다. */}
      <div className="px-5 pb-[calc(var(--bottom-nav-space)+16px)]">
        <Link
          href="/growth-chart"
          className="block rounded-[8px] bg-gray-100 px-4 py-3 text-[13px] font-medium text-gray-600 active:bg-gray-200"
        >
          개월별 표준 키·몸무게 표 보기 →
        </Link>
      </div>
    </>
  );
}
