import type { Metadata } from 'next';
import NursingRoomClient from './NursingRoomClient';

export const metadata: Metadata = {
  title: '수유실 찾기',
  description:
    '내 주변 수유실을 지도에서 찾아보세요. 위치, 편의시설, 운영시간 정보를 제공하고, 새로운 수유실을 제보할 수도 있어요.',
  alternates: { canonical: '/nursing-room' },
  openGraph: {
    title: '수유실 찾기 - 내 주변 수유실 지도 | 아기랑',
    description:
      '내 주변 수유실을 지도에서 찾아보세요. 위치, 편의시설, 운영시간 정보를 제공하고, 새로운 수유실을 제보할 수도 있어요.',
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

export default function NursingRoomPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only" aria-label="수유실 찾기 안내">
        <h1>수유실 찾기 - 내 주변 수유실 지도</h1>
        <p>
          현재 위치 기반으로 주변 수유실과 기저귀 교환대를 지도에서 찾아줍니다.
          각 수유실의 위치, 편의시설, 운영시간 정보를 제공하며, 새로운 수유실을
          직접 제보할 수도 있습니다.
        </p>
        <h2>주요 기능</h2>
        <ul>
          <li>위치 기반 주변 수유실 검색</li>
          <li>수유실 편의시설 및 운영시간 확인</li>
          <li>지도에서 수유실 위치 확인</li>
          <li>새로운 수유실 제보</li>
        </ul>
      </section>
      <NursingRoomClient />
    </>
  );
}
