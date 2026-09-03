import type { Metadata } from 'next';
import Link from 'next/link';
import NursingRoomClient from './NursingRoomClient';
import { getSidoSummaries } from '@/lib/nursingRoomRegions';

// 지역 데이터는 배포 시점에 굳는다(nursingRoomRegions 의 force-cache 와 한 쌍).
export const revalidate = false;

export const metadata: Metadata = {
  title: '수유실 찾기',
  description:
    '전국 수유실을 지역별로 찾아보세요. 위치, 편의시설, 아빠 이용 가능 여부, 운영 정보를 제공하고, 새로운 수유실을 제보할 수도 있어요.',
  alternates: { canonical: '/nursing-room' },
  openGraph: {
    title: '수유실 찾기 - 전국 수유실 지역별 정보 | 아기랑',
    description:
      '전국 수유실을 지역별로 찾아보세요. 위치, 편의시설, 아빠 이용 가능 여부, 운영 정보를 제공하고, 새로운 수유실을 제보할 수도 있어요.',
    url: 'https://baby-rang.spectrify.kr/nursing-room',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "아기랑 수유실 찾기",
  description:
    "현재 위치 기반으로 주변 수유실과 기저귀 교환대를 지도에서 찾아줍니다. 각 수유실의 위치, 편의시설, 운영시간 정보를 제공하며, 새로운 수유실을 직접 제보할 수도 있습니다.",
  provider: { "@type": "Organization", name: "Spectrify" },
  serviceType: "수유실 위치 탐색",
  areaServed: { "@type": "Country", name: "KR" },
  url: "https://baby-rang.spectrify.kr/nursing-room",
};

export default async function NursingRoomPage() {
  // 지도 화면은 h-dvh 전체를 차지하므로 지역 인덱스는 sr-only 로 둔다.
  // 크롤러가 246개 지역 페이지를 발견하는 진입점 역할 (sitemap 과 이중화).
  const sidos = await getSidoSummaries();
  const totalRooms = sidos.reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only" aria-label="수유실 찾기 안내">
        <h1>수유실 찾기 - 전국 수유실 지역별 정보</h1>
        <p>
          현재 위치 기반으로 주변 수유실과 기저귀 교환대를 지도에서 찾아줍니다.
          각 수유실의 위치, 편의시설, 운영시간 정보를 제공하며, 새로운 수유실을
          직접 제보할 수도 있습니다.
          {totalRooms > 0
            ? ` 전국 ${totalRooms.toLocaleString()}곳의 수유실 정보를 지역별로 정리해 두었습니다.`
            : ''}
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>위치 기반 주변 수유실 검색</li>
          <li>수유실 편의시설 및 운영시간 확인</li>
          <li>지도에서 수유실 위치 확인</li>
          <li>아빠 이용 가능 수유실 확인</li>
          <li>새로운 수유실 제보</li>
        </ul>
        {sidos.length > 0 ? (
          <nav aria-label="지역별 수유실">
            <h2>지역별 수유실</h2>
            <ul>
              {sidos.map((s) => (
                <li key={s.sido}>
                  <Link href={`/nursing-room/${s.slug}`}>
                    {s.sido} 수유실 {s.count}곳
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </section>
      <NursingRoomClient />
    </>
  );
}
