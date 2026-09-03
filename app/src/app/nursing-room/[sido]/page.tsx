import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllRegionPaths,
  getSidoDetail,
  sidoFullName,
  sortRooms,
} from "@/lib/nursingRoomRegions";
import {
  MapCta,
  RegionFaq,
  RegionRoomList,
} from "../_components/RegionRoomList";

const SITE_URL = "https://baby-rang.spectrify.kr";

/** 시도 페이지에 노출할 대표 수유실 수 — 나머지는 시군구 페이지에서 본다. */
const PREVIEW_LIMIT = 20;

// 이 라우트는 빌드 시 생성한 HTML 만 서빙한다.
//
// 요청 시 재생성(ISR)을 허용하면 Vercel 런타임에서만 렌더가 실패해 500 이 났다.
// 수유실 데이터는 거의 바뀌지 않아 배포 시점 갱신으로 충분하므로,
// 재생성을 끄고 generateStaticParams 에 없는 지역은 곧바로 404 로 보낸다.
export const revalidate = false;
export const dynamicParams = false;

export async function generateStaticParams() {
  const { sidos } = await getAllRegionPaths();
  return sidos.map((sido) => ({ sido }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string }>;
}): Promise<Metadata> {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const detail = await getSidoDetail(sido);
  if (!detail) return {};

  const fullName = sidoFullName(sido);
  const title = `${sido} 수유실 ${detail.rooms.length}곳 - 위치·편의시설 정보`;
  const description = `${fullName}의 수유실 ${detail.rooms.length}곳을 시군구별로 정리했습니다. 주소, 건물 내 상세 위치, 아빠 이용 가능 여부, 운영 정보를 한눈에 확인하세요.`;
  const url = `${SITE_URL}/nursing-room/${encodeURIComponent(sido)}`;

  return {
    title,
    description,
    alternates: { canonical: `/nursing-room/${encodeURIComponent(sido)}` },
    openGraph: { title: `${title} | 아기랑`, description, url },
  };
}

export default async function SidoPage({
  params,
}: {
  params: Promise<{ sido: string }>;
}) {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const detail = await getSidoDetail(sido);
  if (!detail) notFound();

  const { rooms, sigungus } = detail;
  const fullName = sidoFullName(sido);
  const dadCount = rooms.filter((r) => r.dadAvailable).length;
  const familyCount = rooms.filter((r) => r.type.includes("가족")).length;
  const preview = sortRooms(rooms).slice(0, PREVIEW_LIMIT);

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
          item: `${SITE_URL}/nursing-room/${encodeURIComponent(sido)}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${fullName} 수유실 목록`,
      numberOfItems: rooms.length,
      itemListElement: preview.map((room, i) => ({
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
      q: `${sido}에 수유실이 몇 곳 있나요?`,
      a: `${fullName} 전역에 총 ${rooms.length}곳의 수유실이 있습니다. 이 중 ${dadCount}곳은 아빠도 함께 이용할 수 있습니다.`,
    },
    {
      q: "아빠도 이용할 수 있는 수유실은 어떻게 찾나요?",
      a: `아빠 이용이 가능한 수유실에는 목록에 '아빠 이용 가능' 표시가 붙습니다. ${sido}에서는 ${rooms.length}곳 중 ${dadCount}곳이 여기에 해당합니다. 가족수유실은 보통 아빠 동반이 가능합니다.`,
    },
    {
      q: "수유실 정보가 실제와 다르면 어떻게 하나요?",
      a: "아기랑 수유실 찾기 화면에서 새로운 수유실을 제보하거나 잘못된 정보를 알려주실 수 있습니다. 확인 후 반영됩니다.",
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
          <span>{sido}</span>
        </nav>

        <h1 className="text-[22px] font-bold leading-snug text-app-black">
          {sido} 수유실 {rooms.length}곳
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
          {fullName}에 등록된 수유실 {rooms.length}곳의 위치와 편의시설 정보를
          정리했습니다. 이 중 아빠도 함께 이용할 수 있는 곳은 {dadCount}곳,
          기저귀 교환대 등을 갖춘 가족수유실은 {familyCount}곳입니다. 아래
          시군구를 선택하면 해당 지역의 전체 목록을 볼 수 있습니다.
        </p>

        <section className="mt-8">
          <h2 className="mb-3 text-[16px] font-bold text-app-black">
            {sido} 시군구별 수유실
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {sigungus.map((s) => (
              <li key={s.sigungu}>
                <Link
                  href={`/nursing-room/${encodeURIComponent(sido)}/${encodeURIComponent(s.sigungu)}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <span className="text-[14px] font-medium text-app-black">
                    {s.sigungu}
                  </span>
                  <span className="text-[13px] text-gray-500">{s.count}곳</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-[16px] font-bold text-app-black">
            {sido} 주요 수유실
          </h2>
          <RegionRoomList rooms={preview} />
          {rooms.length > PREVIEW_LIMIT ? (
            <p className="mt-3 text-[13px] text-gray-500">
              나머지 {rooms.length - PREVIEW_LIMIT}곳은 위 시군구별 목록에서 확인할
              수 있습니다.
            </p>
          ) : null}
        </section>

        <RegionFaq items={faq} />
        <MapCta />
      </main>
    </>
  );
}
