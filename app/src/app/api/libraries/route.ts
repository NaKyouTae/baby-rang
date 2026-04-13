import { NextResponse } from "next/server";

// data.go.kr 공공데이터 API 프록시 (전국공공도서관정보)
// 2024년 통계 데이터 + 2021년 기본정보 데이터를 매칭하여 제공
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 2024년 통계 데이터
const STATS_API_URL =
  "https://api.odcloud.kr/api/15072611/v1/uddi:4e0d4d95-76e2-4a03-9886-ba11052ac3fb";

// 2021년 기본정보 데이터 (주소, 개장시간, 휴관일, 홈페이지 등)
const INFO_API_URL =
  "https://api.odcloud.kr/api/15072611/v1/uddi:399f3ae3-2e03-4c98-89b4-bb2d37369935";

interface RawStats {
  도서관명: string;
  행정구역: string;
  시군구: string;
  도서관구분: string;
  도서관코드: number;
  "장서수(인쇄)": number;
  사서수: string;
  대출자수: number;
  대출권수: number;
  "자료구입비(천원)": number;
  평가년도: number;
}

interface RawInfo {
  도서관_코드: number;
  도서관명: string;
  주소: string;
  상세주소: string;
  개장시간: string;
  도서관휴일: string;
  홈페이지: string;
  설립년도: number;
  도서관_구분_설명: string;
}

/** HTML 엔티티(&#40; 등)를 일반 문자로 디코딩 */
function decodeHtmlEntities(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

// 기본정보 인메모리 캐시 (도서관코드 → 기본정보)
let infoCache: Map<number, RawInfo> | null = null;
let infoCacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

async function getInfoMap(serviceKey: string): Promise<Map<number, RawInfo>> {
  if (infoCache && Date.now() - infoCacheTime < CACHE_TTL) return infoCache;

  const map = new Map<number, RawInfo>();
  const perPage = 1000;
  let page = 1;
  let total = Infinity;

  while ((page - 1) * perPage < total) {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      returnType: "JSON",
      serviceKey,
    });

    try {
      const res = await fetch(`${INFO_API_URL}?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) break;
      const json = await res.json();
      total = json.totalCount ?? 0;
      const list: RawInfo[] = json.data ?? [];
      for (const item of list) {
        if (item.도서관_코드) map.set(item.도서관_코드, item);
      }
    } catch {
      break;
    }
    page++;
  }

  infoCache = map;
  infoCacheTime = Date.now();
  console.log(`[libraries] info cache loaded: ${map.size} entries`);
  return map;
}

export async function GET(req: Request) {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { libraries: [], message: "DATA_GO_KR_SERVICE_KEY is not set" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("perPage") || "100";
  const region = searchParams.get("region");
  const district = searchParams.get("district");
  const query = searchParams.get("query");

  const params = new URLSearchParams({
    page,
    perPage,
    returnType: "JSON",
    serviceKey,
  });

  try {
    // 통계 데이터와 기본정보 캐시를 병렬로 로드
    const [statsRes, infoMap] = await Promise.all([
      fetch(`${STATS_API_URL}?${params.toString()}`, { cache: "no-store" }),
      getInfoMap(serviceKey),
    ]);

    if (!statsRes.ok) {
      const text = await statsRes.text();
      console.error("[libraries] upstream error", statsRes.status, text);
      return NextResponse.json(
        { libraries: [], message: `upstream ${statsRes.status}` },
        { status: 502 },
      );
    }

    const json = await statsRes.json();
    let list: RawStats[] = Array.isArray(json?.data) ? json.data : [];

    // 서버사이드 필터링
    if (region) {
      list = list.filter((item) => item.행정구역 === region);
    }
    if (district) {
      list = list.filter((item) => item.시군구 === district);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (item) =>
          item.도서관명.toLowerCase().includes(q) ||
          item.시군구.toLowerCase().includes(q),
      );
    }

    const libraries = list.map((item) => {
      const info = infoMap.get(item.도서관코드);
      const address = info
        ? decodeHtmlEntities([info.주소, info.상세주소].filter(Boolean).join(" "))
        : "";
      return {
        name: item.도서관명,
        region: item.행정구역,
        district: item.시군구,
        type: item.도서관구분,
        code: item.도서관코드,
        books: item["장서수(인쇄)"],
        librarians: parseFloat(item.사서수) || 0,
        borrowers: item.대출자수,
        loans: item.대출권수,
        budget: item["자료구입비(천원)"],
        year: item.평가년도,
        // 기본정보 (2021년 데이터) — HTML 엔티티 디코딩
        address: address || undefined,
        openHours: decodeHtmlEntities(info?.개장시간) || undefined,
        closedDays: decodeHtmlEntities(info?.도서관휴일) || undefined,
        homepage: info?.홈페이지 || undefined,
        established: info?.설립년도 || undefined,
      };
    });

    return NextResponse.json(
      {
        libraries,
        totalCount: json.totalCount ?? 0,
        page: Number(page),
        perPage: Number(perPage),
        message: "ok",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    console.error("[libraries] fetch failed", e);
    return NextResponse.json(
      { libraries: [], message: "fetch failed" },
      { status: 502 },
    );
  }
}
