/**
 * 수유실 지역 데이터 레이어 (SEO 정적 페이지용).
 *
 * sooyusil.com 오픈 API 의 전국 수유실 목록을 받아 시도/시군구로 그룹핑한다.
 * `/nursing-room/[sido]`, `/nursing-room/[sido]/[sigungu]` 페이지가 이 모듈만 사용하며,
 * 지도 기반 탐색 화면(NursingRoomClient)과는 독립적으로 동작한다.
 *
 * 원본 API 는 3,000건 남짓을 한 번에 내려주므로 페이지마다 호출하지 않고
 * fetch 단계에서 하루 단위로 캐시한 뒤 메모리에서 그룹핑한다.
 */

import { cache } from "react";

const SOOYUSIL_ENDPOINT = "https://sooyusil.com/api/nursingRoomJSON.do";

/** 하루 1회 갱신. 수유실 정보는 거의 바뀌지 않는다. */
export const REGION_REVALIDATE_SECONDS = 86400;

interface RawRoom {
  roomNo?: string;
  roomName?: string;
  cityName?: string; // 시군구 (예: 남구)
  zoneName?: string; // 시도 (예: 울산)
  townName?: string; // 읍면동 (예: 삼산동)
  roomTypeName?: string;
  managerTelNo?: string;
  address?: string;
  location?: string; // 건물 내 상세 위치
  fatherUseCode?: string;
  gpsLat?: string;
  gpsLong?: string;
}

export interface NursingRoom {
  id: string;
  name: string;
  sido: string;
  sigungu: string;
  town: string;
  type: string;
  tel?: string;
  address: string;
  detailLocation?: string;
  dadAvailable: boolean;
  lat?: number;
  lng?: number;
}

export interface SigunguSummary {
  sigungu: string;
  count: number;
  dadAvailableCount: number;
}

export interface SidoSummary {
  sido: string;
  count: number;
  sigunguCount: number;
}

/**
 * API 가 내려주는 시도명을 URL 슬러그이자 검색 키워드로 쓸 짧은 이름으로 정규화한다.
 * "강원특별자치도 수유실" 보다 "강원 수유실" 로 검색하는 사람이 압도적으로 많다.
 */
const SIDO_SLUG: Record<string, string> = {
  강원특별자치도: "강원",
  전북특별자치도: "전북",
  제주특별자치도: "제주",
  세종특별자치시: "세종",
};

/** 슬러그 → 본문에 노출할 정식 명칭. */
const SIDO_FULL_NAME: Record<string, string> = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
};

export function toSidoSlug(zoneName: string): string {
  const name = zoneName.trim();
  return SIDO_SLUG[name] ?? name;
}

export function sidoFullName(slug: string): string {
  return SIDO_FULL_NAME[slug] ?? slug;
}

/**
 * 전국 수유실 원본을 가져온다.
 * API 키가 없거나(로컬/프리뷰 빌드) 외부 API 가 실패하면 빈 배열을 돌려주고,
 * 호출부는 notFound() 로 처리한다. 빌드 자체를 깨뜨리지 않는다.
 */
export const fetchAllNursingRooms = cache(async (): Promise<NursingRoom[]> => {
  const apiKey = process.env.SOOYUSIL_API_KEY;
  if (!apiKey) {
    console.warn("[nursingRoomRegions] SOOYUSIL_API_KEY 미설정 — 지역 페이지를 건너뜁니다.");
    return [];
  }

  try {
    // 옵션은 이미 프로덕션에서 정상 동작하는 /api/nursing-rooms/public 과 동일하게 맞춘다.
    // (Next.js 가 캐시용으로 감싼 fetch 에 signal 을 넘기면 런타임에 따라 예외가 난다)
    const res = await fetch(`${SOOYUSIL_ENDPOINT}?confirmApiKey=${apiKey}`, {
      next: { revalidate: REGION_REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`[nursingRoomRegions] upstream ${res.status}`);
      return [];
    }

    const data = await res.json();
    const list: RawRoom[] = Array.isArray(data?.roomList) ? data.roomList : [];

    return list
      .map((r, i): NursingRoom | null => {
        const name = r.roomName?.trim();
        const zone = r.zoneName?.trim();
        const city = r.cityName?.trim();
        if (!name || !zone || !city) return null;

        const lat = Number(r.gpsLat);
        const lng = Number(r.gpsLong);

        return {
          id: r.roomNo || `${zone}-${city}-${i}`,
          name,
          sido: toSidoSlug(zone),
          sigungu: city,
          town: r.townName?.trim() ?? "",
          type: r.roomTypeName?.trim() || "수유실",
          tel: r.managerTelNo?.trim() || undefined,
          address: r.address?.trim() || [zone, city, r.townName].filter(Boolean).join(" "),
          detailLocation: r.location?.trim() || undefined,
          dadAvailable: r.fatherUseCode === "1",
          lat: Number.isFinite(lat) ? lat : undefined,
          lng: Number.isFinite(lng) ? lng : undefined,
        };
      })
      .filter((r): r is NursingRoom => r !== null);
  } catch (e) {
    console.error("[nursingRoomRegions] fetch 실패", e);
    return [];
  }
});

/** 시도별 요약 — 지역 인덱스와 sitemap 에서 사용. */
export async function getSidoSummaries(): Promise<SidoSummary[]> {
  const rooms = await fetchAllNursingRooms();
  const bySido = new Map<string, Set<string>>();
  const counts = new Map<string, number>();

  for (const room of rooms) {
    counts.set(room.sido, (counts.get(room.sido) ?? 0) + 1);
    if (!bySido.has(room.sido)) bySido.set(room.sido, new Set());
    bySido.get(room.sido)!.add(room.sigungu);
  }

  return [...counts.entries()]
    .map(([sido, count]) => ({
      sido,
      count,
      sigunguCount: bySido.get(sido)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 특정 시도의 수유실 + 시군구 요약. 데이터가 없으면 null. */
export async function getSidoDetail(sido: string): Promise<{
  rooms: NursingRoom[];
  sigungus: SigunguSummary[];
} | null> {
  const all = await fetchAllNursingRooms();
  const rooms = all.filter((r) => r.sido === sido);
  if (rooms.length === 0) return null;

  const map = new Map<string, SigunguSummary>();
  for (const room of rooms) {
    const cur = map.get(room.sigungu) ?? {
      sigungu: room.sigungu,
      count: 0,
      dadAvailableCount: 0,
    };
    cur.count += 1;
    if (room.dadAvailable) cur.dadAvailableCount += 1;
    map.set(room.sigungu, cur);
  }

  return {
    rooms,
    sigungus: [...map.values()].sort((a, b) => b.count - a.count),
  };
}

/** 특정 시군구의 수유실. 없으면 null. */
export async function getSigunguRooms(
  sido: string,
  sigungu: string,
): Promise<NursingRoom[] | null> {
  const all = await fetchAllNursingRooms();
  const rooms = all.filter((r) => r.sido === sido && r.sigungu === sigungu);
  return rooms.length > 0 ? rooms : null;
}

/** generateStaticParams / sitemap 이 함께 쓰는 전체 지역 목록. */
export async function getAllRegionPaths(): Promise<{
  sidos: string[];
  pairs: Array<{ sido: string; sigungu: string }>;
}> {
  const rooms = await fetchAllNursingRooms();
  const sidos = new Set<string>();
  const pairs = new Map<string, { sido: string; sigungu: string }>();

  for (const room of rooms) {
    sidos.add(room.sido);
    pairs.set(`${room.sido}/${room.sigungu}`, {
      sido: room.sido,
      sigungu: room.sigungu,
    });
  }

  return { sidos: [...sidos], pairs: [...pairs.values()] };
}

/**
 * 원본 API 의 전화번호 표기가 일정하지 않다.
 * "052-226-1943" 처럼 정상인 것도 있지만 "522261958" 처럼 지역번호 앞 0 이
 * 빠진 채 숫자만 오는 경우가 섞여 있어, 그대로 tel: 링크에 쓰면 잘못 걸린다.
 *
 * 숫자만 남긴 뒤 앞자리 0 을 보정하고 국내 번호 체계에 맞춰 하이픈을 넣는다.
 * 알 수 없는 형태면 원본을 그대로 돌려준다(임의로 바꾸지 않는다).
 */
export function normalizeTel(raw?: string): { display: string; href: string } | null {
  if (!raw) return null;
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;

  // 지역번호 앞 0 누락 보정 (522261958 → 0522261958)
  if (!digits.startsWith("0") && !/^1[5678]/.test(digits)) digits = `0${digits}`;

  // 전국대표번호 15XX/16XX/18XX-XXXX
  if (/^1[5678]\d{2}\d{4}$/.test(digits)) {
    return { display: `${digits.slice(0, 4)}-${digits.slice(4)}`, href: digits };
  }

  // 서울 02
  if (digits.startsWith("02")) {
    const rest = digits.slice(2);
    if (rest.length === 7 || rest.length === 8) {
      const mid = rest.length === 7 ? 3 : 4;
      return {
        display: `02-${rest.slice(0, mid)}-${rest.slice(mid)}`,
        href: digits,
      };
    }
    return { display: raw, href: digits };
  }

  // 그 외 3자리 지역번호 / 휴대폰
  const rest = digits.slice(3);
  if (rest.length === 7 || rest.length === 8) {
    const mid = rest.length === 7 ? 3 : 4;
    return {
      display: `${digits.slice(0, 3)}-${rest.slice(0, mid)}-${rest.slice(mid)}`,
      href: digits,
    };
  }

  return { display: raw, href: digits };
}

/** 목록을 읽기 좋은 순서로 — 아빠 이용 가능 우선, 그다음 이름순. */
export function sortRooms(rooms: NursingRoom[]): NursingRoom[] {
  return [...rooms].sort((a, b) => {
    if (a.dadAvailable !== b.dadAvailable) return a.dadAvailable ? -1 : 1;
    // localeCompare 는 런타임 ICU 구성에 따라 동작이 달라진다.
    // 한글 음절은 유니코드 순서가 곧 가나다 순이라 코드포인트 비교로 충분하다.
    if (a.name === b.name) return 0;
    return a.name < b.name ? -1 : 1;
  });
}
