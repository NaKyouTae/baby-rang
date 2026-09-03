import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllRegionPaths,
  getSidoDetail,
  getSigunguRooms,
  sidoFullName,
  sortRooms,
} from "@/lib/nursingRoomRegions";
import {
  MapCta,
  RegionFaq,
  RegionRoomList,
} from "../../_components/RegionRoomList";

const SITE_URL = "https://baby-rang.spectrify.kr";

/** 하단에 노출할 같은 시도 내 다른 시군구 링크 수. */
const SIBLING_LIMIT = 8;

// 세그먼트 설정은 정적 분석 대상이라 리터럴이어야 한다 (= REGION_REVALIDATE_SECONDS)
export const revalidate = 86400;

export async function generateStaticParams() {
  const { pairs } = await getAllRegionPaths();
  return pairs;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string; sigungu: string }>;
}): Promise<Metadata> {
  const raw = await params;
  const sido = decodeURIComponent(raw.sido);
  const sigungu = decodeURIComponent(raw.sigungu);
  const rooms = await getSigunguRooms(sido, sigungu);
  if (!rooms) return {};

  const title = `${sido} ${sigungu} 수유실 ${rooms.length}곳 - 위치·편의시설 정보`;
  const description = `${sidoFullName(sido)} ${sigungu}의 수유실 ${rooms.length}곳을 정리했습니다. 주소, 건물 내 상세 위치, 아빠 이용 가능 여부, 전화번호를 확인하세요.`;
  const path = `/nursing-room/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | 아기랑`, description, url: `${SITE_URL}${path}` },
  };
}

export default async function SigunguPage({
  params,
}: {
  params: Promise<{ sido: string; sigungu: string }>;
}) {
  const raw = await params;
  const sido = decodeURIComponent(raw.sido);
  const sigungu = decodeURIComponent(raw.sigungu);

  const rooms = await getSigunguRooms(sido, sigungu);
  if (!rooms) notFound();

  const sorted = sortRooms(rooms);
  const fullName = sidoFullName(sido);
  const dadCount = rooms.filter((r) => r.dadAvailable).length;
  const towns = [...new Set(rooms.map((r) => r.town).filter(Boolean))];

  const detail = await getSidoDetail(sido);
  const siblings = (detail?.sigungus ?? [])
    .filter((s) => s.sigungu !== sigungu)
    .slice(0, SIBLING_LIMIT);

  const basePath = `/nursing-room/${encodeURIComponent(sido)}`;
  const selfPath = `${basePath}/${encodeURIComponent(sigungu)}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "수유실 찾기",
          item: `${SITE_URL}/nursing-room`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: `${sido} 수유실`,
          item: `${SITE_URL}${basePath}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${sigungu} 수유실`,
          item: `${SITE_URL}${selfPath}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${fullName} ${sigungu} 수유실 목록`,
      numberOfItems: sorted.length,
      itemListElement: sorted.map((room, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Place",
          name: room.name,
          address: room.address,
          ...(room.tel ? { telephone: room.tel } : {}),
          ...(room.lat && room.lng
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: room.lat,
                  longitude: room.lng,
                },
              }
            : {}),
        },
      })),
    },
  ];

  const faq = [
    {
      q: `${sigungu}에 수유실이 몇 곳 있나요?`,
      a: `${fullName} ${sigungu}에는 총 ${sorted.length}곳의 수유실이 등록되어 있습니다. 이 중 ${dadCount}곳은 아빠도 함께 이용할 수 있습니다.`,
    },
    {
      q: `${sigungu} 수유실은 어디에 많나요?`,
      a:
        towns.length > 0
          ? `${towns.slice(0, 6).join(", ")} 등에 분포해 있습니다. 대형마트, 백화점, 공공기관, 지하철역, 병원 등에 주로 설치되어 있습니다.`
          : "대형마트, 백화점, 공공기관, 지하철역, 병원 등에 주로 설치되어 있습니다.",
    },
    {
      q: "수유실 이용 전에 확인할 점이 있나요?",
      a: "건물 운영 시간에 따라 수유실 이용 시간이 달라질 수 있습니다. 방문 전 전화로 운영 여부를 확인하시면 좋습니다. 기저귀 교환대나 온수기 유무는 시설마다 다릅니다.",
    },
  ];

  // 화면 FAQ 와 동일한 내용을 FAQPage 스키마로도 노출한다.
  // (AI 검색이 인용하기 가장 쉬운 형태)
  const structuredData = [
    ...jsonLd,
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="px-4 pt-6 pb-[calc(var(--bottom-nav-space)+32px)]">
        <nav aria-label="위치" className="mb-3 text-[12px] text-gray-500">
          <Link href="/nursing-room" className="underline">
            수유실 찾기
          </Link>
          <span className="mx-1">›</span>
          <Link href={basePath} className="underline">
            {sido}
          </Link>
          <span className="mx-1">›</span>
          <span>{sigungu}</span>
        </nav>

        <h1 className="text-[22px] font-bold leading-snug text-app-black">
          {sido} {sigungu} 수유실 {sorted.length}곳
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          {fullName} {sigungu}에 등록된 수유실 {sorted.length}곳의 주소와 건물 내
          상세 위치를 정리했습니다. 아빠도 함께 이용할 수 있는 곳은 {dadCount}
          곳입니다.
          {towns.length > 0
            ? ` ${towns.slice(0, 5).join(", ")} 등에 분포해 있습니다.`
            : ""}
        </p>

        <section className="mt-6">
          <h2 className="mb-3 text-[16px] font-bold text-app-black">
            {sigungu} 수유실 전체 목록
          </h2>
          <RegionRoomList rooms={sorted} />
        </section>

        {siblings.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-[16px] font-bold text-app-black">
              {sido}의 다른 지역
            </h2>
            <ul className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <li key={s.sigungu}>
                  <Link
                    href={`${basePath}/${encodeURIComponent(s.sigungu)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-app-black"
                  >
                    {s.sigungu}
                    <span className="text-gray-500">{s.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <RegionFaq items={faq} />
        <MapCta />
      </main>
    </>
  );
}
