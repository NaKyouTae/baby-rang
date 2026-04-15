import { NextResponse } from "next/server";

/**
 * 기상청 단기예보 + 에어코리아 대기오염정보 통합 프록시
 * GET /api/weather?lat=37.5665&lng=126.978
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.DATA_GO_KR_API_KEY ?? "";
const KMA_BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const KMA_FCST_BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
const AIR_SIDO = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

// 위경도 → 기상청 격자 좌표 변환
function latLngToGrid(lat: number, lng: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

// 위경도 → 시도명 매핑 (대략적인 경계 기반)
function getSidoName(lat: number, lng: number): string {
  // 제주
  if (lat < 33.6) return "제주";
  // 부산/울산/경남
  if (lat < 35.3 && lng > 128.5) return "부산";
  if (lat < 35.7 && lat >= 35.3 && lng > 129.0) return "울산";
  if (lat < 35.5 && lng > 127.5 && lng <= 129.0) return "경남";
  // 대구/경북
  if (lat >= 35.5 && lat < 36.5 && lng > 128.0) return "대구";
  if (lat >= 36.0 && lat < 37.0 && lng > 128.5) return "경북";
  // 광주/전남/전북
  if (lat < 35.3 && lng <= 127.5 && lng > 126.5) return "광주";
  if (lat < 35.0 && lng <= 126.5) return "전남";
  if (lat >= 35.0 && lat < 36.0 && lng < 127.5) return "전북";
  // 대전/충남/충북/세종
  if (lat >= 36.0 && lat < 36.5 && lng >= 126.8 && lng < 127.5) return "대전";
  if (lat >= 36.0 && lat < 37.0 && lng < 126.8) return "충남";
  if (lat >= 36.0 && lat < 37.0 && lng >= 127.5 && lng <= 128.5) return "충북";
  if (lat >= 36.4 && lat < 36.7 && lng >= 126.9 && lng < 127.3) return "세종";
  // 인천
  if (lat >= 37.2 && lat < 37.6 && lng < 126.7) return "인천";
  // 경기
  if (lat >= 37.0 && lat < 38.0 && lng < 127.5 && !(lat >= 37.45 && lat < 37.7 && lng >= 126.8 && lng < 127.2)) return "경기";
  // 서울
  if (lat >= 37.45 && lat < 37.7 && lng >= 126.8 && lng < 127.2) return "서울";
  // 강원
  if (lat >= 37.0 && lng >= 127.5) return "강원";
  // fallback
  return "서울";
}

// 현재 base_date, base_time 계산 (초단기실황: 매시 정각 발표, API 제공은 40분 이후)
function getBaseDateTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  let hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  if (minute < 40) {
    hour -= 1;
    if (hour < 0) {
      hour = 23;
      const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
      return {
        base_date: `${prev.getUTCFullYear()}${String(prev.getUTCMonth() + 1).padStart(2, "0")}${String(prev.getUTCDate()).padStart(2, "0")}`,
        base_time: "2300",
      };
    }
  }

  return {
    base_date: `${year}${month}${day}`,
    base_time: `${String(hour).padStart(2, "0")}00`,
  };
}

// 초단기예보 base_time 계산 (매시 30분 발표)
function getFcstBaseDateTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  let hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  if (minute < 45) {
    hour -= 1;
    if (hour < 0) {
      hour = 23;
      const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
      return {
        base_date: `${prev.getUTCFullYear()}${String(prev.getUTCMonth() + 1).padStart(2, "0")}${String(prev.getUTCDate()).padStart(2, "0")}`,
        base_time: "2330",
      };
    }
  }

  return {
    base_date: `${year}${month}${day}`,
    base_time: `${String(hour).padStart(2, "0")}30`,
  };
}

interface WeatherItem {
  category: string;
  obsrValue?: string;
  fcstValue?: string;
}

interface AirItem {
  pm10Value?: string;
  pm25Value?: string;
  pm10Grade?: string;
  pm25Grade?: string;
  khaiValue?: string;
  khaiGrade?: string;
  dataTime?: string;
  stationName?: string;
}

async function safeJson(res: Response, label: string) {
  const text = await res.text();
  if (!res.ok) {
    console.error(`[weather] ${label} HTTP ${res.status}: ${text.slice(0, 300)}`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[weather] ${label} JSON parse failed: ${text.slice(0, 300)}`);
    return null;
  }
}

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "DATA_GO_KR_API_KEY is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat, lng required" }, { status: 400 });
  }

  try {
    const { nx, ny } = latLngToGrid(lat, lng);
    const { base_date, base_time } = getBaseDateTime();
    const fcst = getFcstBaseDateTime();
    const sidoName = getSidoName(lat, lng);

    // 기상청 초단기실황 + 초단기예보 + 에어코리아 시도별 실시간 동시 호출
    const [weatherRes, fcstRes, airRes] = await Promise.all([
      fetch(
        `${KMA_BASE}?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`,
      ),
      fetch(
        `${KMA_FCST_BASE}?serviceKey=${API_KEY}&numOfRows=60&pageNo=1&dataType=JSON&base_date=${fcst.base_date}&base_time=${fcst.base_time}&nx=${nx}&ny=${ny}`,
      ),
      fetch(
        `${AIR_SIDO}?serviceKey=${API_KEY}&returnType=json&sidoName=${encodeURIComponent(sidoName)}&ver=1.3&numOfRows=100&pageNo=1`,
      ),
    ]);

    // 날씨 파싱
    const weatherData = await safeJson(weatherRes, "기상청 초단기실황");
    const weatherItems: WeatherItem[] =
      weatherData?.response?.body?.items?.item ?? [];

    const weather: Record<string, string> = {};
    for (const item of weatherItems) {
      if (item.obsrValue !== undefined) {
        weather[item.category] = item.obsrValue;
      }
    }

    // 초단기예보 파싱 (하늘상태, 강수형태)
    const fcstData = await safeJson(fcstRes, "기상청 초단기예보");
    const fcstItems: WeatherItem[] = fcstData?.response?.body?.items?.item ?? [];
    const fcstMap: Record<string, string> = {};
    for (const item of fcstItems) {
      if (item.fcstValue !== undefined && !fcstMap[item.category]) {
        fcstMap[item.category] = item.fcstValue;
      }
    }

    // 시도별 대기오염 파싱 — 첫 번째 유효한 측정소 데이터 사용
    const airData = await safeJson(airRes, "에어코리아 시도별");
    const airItems: AirItem[] = airData?.response?.body?.items ?? [];
    let air: AirItem = {};
    for (const item of airItems) {
      if (item.pm10Value && item.pm10Value !== "-" && item.pm25Value && item.pm25Value !== "-") {
        air = item;
        break;
      }
    }

    // SKY: 1 맑음, 3 구름많음, 4 흐림
    // PTY: 0 없음, 1 비, 2 비/눈, 3 눈, 5 빗방울, 6 빗방울눈날림, 7 눈날림
    const sky = fcstMap["SKY"] ?? "";
    const pty = weather["PTY"] ?? fcstMap["PTY"] ?? "0";

    return NextResponse.json(
      {
        weather: {
          temperature: weather["T1H"] ?? null,
          humidity: weather["REH"] ?? null,
          rainfall: weather["RN1"] ?? null,
          windSpeed: weather["WSD"] ?? null,
          sky,
          pty,
        },
        air: {
          pm10: air.pm10Value ?? null,
          pm25: air.pm25Value ?? null,
          pm10Grade: air.pm10Grade ?? null,
          pm25Grade: air.pm25Grade ?? null,
          khaiValue: air.khaiValue ?? null,
          khaiGrade: air.khaiGrade ?? null,
          stationName: air.stationName ?? "",
          dataTime: air.dataTime ?? null,
        },
        sido: sidoName,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  } catch (e) {
    console.error("[weather] fetch failed", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
