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
const KMA_VILAGE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const KMA_MID_LAND = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";
const KMA_MID_TA = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";
const AIR_SIDO = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";
const AIR_DUST_FRCST = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분
const STALE_TTL_MS = 30 * 60 * 1000; // 30분 (stale 캐시 최대 보관)

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// fresh 캐시 반환 (TTL 이내)
function getFreshCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.data;
}

// stale 캐시 반환 (만료됐지만 아직 보관 중인 데이터)
function getStaleCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > STALE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// 백그라운드 갱신 중인 키 추적 (중복 갱신 방지)
const refreshing = new Set<string>();

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

// 중기육상예보 regId (광역권 단위)
function getMidLandRegId(sido: string, lng: number): string {
  const map: Record<string, string> = {
    "서울": "11B00000",
    "인천": "11B00000",
    "경기": "11B00000",
    "충북": "11C10000",
    "대전": "11C20000",
    "세종": "11C20000",
    "충남": "11C20000",
    "전북": "11F10000",
    "광주": "11F20000",
    "전남": "11F20000",
    "대구": "11H10000",
    "경북": "11H10000",
    "부산": "11H20000",
    "울산": "11H20000",
    "경남": "11H20000",
    "제주": "11G00000",
  };
  if (sido === "강원") {
    return lng > 128.5 ? "11D20000" : "11D10000"; // 영동 / 영서
  }
  return map[sido] ?? "11B00000";
}

// 중기기온예보 regId (대표 도시 단위)
function getMidTaRegId(sido: string, lng: number): string {
  const map: Record<string, string> = {
    "서울": "11B10101",
    "인천": "11B20201",
    "경기": "11B20601", // 수원
    "충북": "11C10301", // 청주
    "대전": "11C20401",
    "세종": "11C20404",
    "충남": "11C20104", // 천안
    "전북": "11F10201", // 전주
    "광주": "11F20501",
    "전남": "11F20401", // 여수
    "대구": "11H10701",
    "경북": "11H10501", // 안동
    "부산": "11H20201",
    "울산": "11H20101",
    "경남": "11H20301", // 창원
    "제주": "11G00201",
  };
  if (sido === "강원") {
    return lng > 128.5 ? "11D20501" : "11D10301"; // 강릉 / 춘천
  }
  return map[sido] ?? "11B10101";
}

// 대기질 예보 informGrade 안에서 사용되는 권역명
function getDustForecastRegion(sido: string, lat: number, lng: number): string {
  if (sido === "경기") return lat >= 37.5 ? "경기북부" : "경기남부";
  if (sido === "강원") return lng > 128.5 ? "영동" : "영서";
  return sido;
}

// 중기예보 tmFc 계산 (06시/18시 발표, 약간의 버퍼)
function getMidFcstTmFc(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();
  const useDate = new Date(kst);
  let useHour = 600;
  if (hour < 6 || (hour === 6 && minute < 30)) {
    useDate.setUTCDate(useDate.getUTCDate() - 1);
    useHour = 1800;
  } else if (hour < 18 || (hour === 18 && minute < 30)) {
    useHour = 600;
  } else {
    useHour = 1800;
  }
  const y = useDate.getUTCFullYear();
  const m = String(useDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(useDate.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}${useHour === 600 ? "0600" : "1800"}`;
}

// 단기예보 base_time 계산 (02, 05, 08, 11, 14, 17, 20, 23 발표, 10분 이후 제공)
function getVilageFcstBaseDateTime(): { base_date: string; base_time: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseHour = -1;
  for (let i = baseHours.length - 1; i >= 0; i--) {
    const bh = baseHours[i];
    if (hour > bh || (hour === bh && minute >= 15)) {
      baseHour = bh;
      break;
    }
  }
  const useDate = new Date(kst);
  if (baseHour === -1) {
    useDate.setUTCDate(useDate.getUTCDate() - 1);
    baseHour = 23;
  }
  const y = useDate.getUTCFullYear();
  const m = String(useDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(useDate.getUTCDate()).padStart(2, "0");
  return {
    base_date: `${y}${m}${d}`,
    base_time: `${String(baseHour).padStart(2, "0")}00`,
  };
}

function addDaysYmd(yyyymmdd: string, days: number): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + days));
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
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
  fcstDate?: string;
  fcstTime?: string;
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

interface HourlyForecast {
  fcstTime: string;
  temperature: string | null;
  sky: string;
  pty: string;
}

interface DailyForecast {
  date: string; // YYYYMMDD
  minTemp: string | null;
  maxTemp: string | null;
  // sky: "맑음" | "구름많음" | "흐림" | "비" | "비/눈" | "눈" 등
  sky: string | null;
  // dust: "좋음" | "보통" | "나쁨" | "매우나쁨" (에어코리아 환경부 기준 예보; D+0~D+2만 제공)
  pm10Forecast: string | null;
  pm25Forecast: string | null;
}

interface WeatherResult {
  weather: {
    temperature: string | null;
    humidity: string | null;
    rainfall: string | null;
    windSpeed: string | null;
    sky: string;
    pty: string;
  };
  air: {
    pm10: string | null;
    pm25: string | null;
    pm10Grade: string | null;
    pm25Grade: string | null;
    khaiValue: string | null;
    khaiGrade: string | null;
    stationName: string;
    dataTime: string | null;
  };
  hourlyForecast: HourlyForecast[];
  dailyForecast: DailyForecast[];
  sido: string;
}

interface FetchCtx {
  nx: number;
  ny: number;
  base_date: string;
  base_time: string;
  fcst: { base_date: string; base_time: string };
  vilage: { base_date: string; base_time: string };
  midFcTime: string;
  sidoName: string;
  midLandRegId: string;
  midTaRegId: string;
  dustRegion: string;
  searchDate: string;
}

interface DustForecastItem {
  informCode?: string;
  informData?: string;
  informGrade?: string;
}

function parseInformGradeForRegion(informGrade: string | undefined, region: string): string | null {
  if (!informGrade) return null;
  const entries = informGrade.split(",").map((s) => s.trim());
  for (const entry of entries) {
    const idx = entry.indexOf(":");
    if (idx === -1) continue;
    const reg = entry.slice(0, idx).trim();
    const grade = entry.slice(idx + 1).trim();
    if (reg === region) return grade;
  }
  return null;
}

// 중기예보 sky 텍스트("구름많고 비" 등)를 표준 라벨로 정규화
function normalizeMidSkyLabel(s: string | undefined | null): string | null {
  if (!s) return null;
  if (s.includes("비/눈")) return "비/눈";
  if (s.includes("눈") && !s.includes("비")) return "눈";
  if (s.includes("비") || s.includes("소나기")) return "비";
  if (s.includes("흐림") || s.includes("흐리고")) return "흐림";
  if (s.includes("구름")) return "구름많음";
  if (s.includes("맑음")) return "맑음";
  return s;
}

// SKY(1/3/4) + PTY(0~7) → 표준 sky 라벨
function skyPtyLabel(sky: string | undefined, pty: string | undefined): string | null {
  const p = Number(pty);
  if (p === 1 || p === 5) return "비";
  if (p === 2 || p === 6) return "비/눈";
  if (p === 3 || p === 7) return "눈";
  const s = Number(sky);
  if (s === 1) return "맑음";
  if (s === 3) return "구름많음";
  if (s === 4) return "흐림";
  return null;
}

async function fetchWeatherData(ctx: FetchCtx): Promise<WeatherResult | null> {
  const { nx, ny, base_date, base_time, fcst, vilage, midFcTime, sidoName, midLandRegId, midTaRegId, dustRegion, searchDate } = ctx;
  const [weatherRes, fcstRes, airRes, vilageRes, midLandRes, midTaRes, dustRes] = await Promise.all([
    fetch(
      `${KMA_BASE}?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`,
    ),
    fetch(
      `${KMA_FCST_BASE}?serviceKey=${API_KEY}&numOfRows=100&pageNo=1&dataType=JSON&base_date=${fcst.base_date}&base_time=${fcst.base_time}&nx=${nx}&ny=${ny}`,
    ),
    fetch(
      `${AIR_SIDO}?serviceKey=${API_KEY}&returnType=json&sidoName=${encodeURIComponent(sidoName)}&ver=1.3&numOfRows=100&pageNo=1`,
    ),
    fetch(
      `${KMA_VILAGE}?serviceKey=${API_KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${vilage.base_date}&base_time=${vilage.base_time}&nx=${nx}&ny=${ny}`,
    ),
    fetch(
      `${KMA_MID_LAND}?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&regId=${midLandRegId}&tmFc=${midFcTime}`,
    ),
    fetch(
      `${KMA_MID_TA}?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&regId=${midTaRegId}&tmFc=${midFcTime}`,
    ),
    fetch(
      `${AIR_DUST_FRCST}?serviceKey=${API_KEY}&returnType=json&searchDate=${searchDate}&numOfRows=100&pageNo=1`,
    ),
  ]);

  const weatherData = await safeJson(weatherRes, "기상청 초단기실황");
  const weatherItems: WeatherItem[] = weatherData?.response?.body?.items?.item ?? [];
  const weather: Record<string, string> = {};
  for (const item of weatherItems) {
    if (item.obsrValue !== undefined) {
      weather[item.category] = item.obsrValue;
    }
  }

  const fcstData = await safeJson(fcstRes, "기상청 초단기예보");
  const fcstItems: WeatherItem[] = fcstData?.response?.body?.items?.item ?? [];
  const fcstMap: Record<string, string> = {};
  for (const item of fcstItems) {
    if (item.fcstValue !== undefined && !fcstMap[item.category]) {
      fcstMap[item.category] = item.fcstValue;
    }
  }

  // 시간별 예보: fcstDate+fcstTime으로 그룹핑 → 다음 4시간 추출
  const hourlyGroups = new Map<string, Record<string, string>>();
  for (const item of fcstItems) {
    if (item.fcstValue !== undefined && item.fcstDate && item.fcstTime) {
      const key = `${item.fcstDate}${item.fcstTime}`;
      let bucket = hourlyGroups.get(key);
      if (!bucket) {
        bucket = {};
        hourlyGroups.set(key, bucket);
      }
      bucket[item.category] = item.fcstValue;
    }
  }
  const hourlyForecast: HourlyForecast[] = Array.from(hourlyGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 4)
    .map(([key, data]) => ({
      fcstTime: key.slice(8, 12),
      temperature: data["T1H"] ?? null,
      sky: data["SKY"] ?? "",
      pty: data["PTY"] ?? "0",
    }));

  const airData = await safeJson(airRes, "에어코리아 시도별");
  const airItems: AirItem[] = airData?.response?.body?.items ?? [];
  let air: AirItem = {};
  for (const item of airItems) {
    if (item.pm10Value && item.pm10Value !== "-" && item.pm25Value && item.pm25Value !== "-") {
      air = item;
      break;
    }
  }

  const sky = fcstMap["SKY"] ?? "";
  const pty = weather["PTY"] ?? fcstMap["PTY"] ?? "0";

  // 단기예보(VilageFcst): D+0~D+2의 TMN/TMX, SKY/PTY 추출
  const vilageData = await safeJson(vilageRes, "기상청 단기예보");
  const vilageItems: WeatherItem[] = vilageData?.response?.body?.items?.item ?? [];
  const vilageByDate = new Map<string, { tmn?: string; tmx?: string; sky?: string; pty?: string }>();
  for (const item of vilageItems) {
    if (!item.fcstDate || item.fcstValue === undefined) continue;
    let bucket = vilageByDate.get(item.fcstDate);
    if (!bucket) {
      bucket = {};
      vilageByDate.set(item.fcstDate, bucket);
    }
    if (item.category === "TMN") bucket.tmn = item.fcstValue;
    else if (item.category === "TMX") bucket.tmx = item.fcstValue;
    else if (item.category === "SKY" && item.fcstTime === "1200") bucket.sky = item.fcstValue;
    else if (item.category === "PTY" && item.fcstTime === "1200") bucket.pty = item.fcstValue;
  }

  // 중기육상예보(MidLandFcst): D+3~D+7의 sky 추출
  const midLandData = await safeJson(midLandRes, "기상청 중기육상예보");
  const midLandRow = midLandData?.response?.body?.items?.item?.[0] ?? {};

  // 중기기온예보(MidTa): D+3~D+7의 min/max temp 추출
  const midTaData = await safeJson(midTaRes, "기상청 중기기온예보");
  const midTaRow = midTaData?.response?.body?.items?.item?.[0] ?? {};

  // 대기질 예보(MinuDustFrcstDspth): D+0~D+2의 PM10/PM2.5 등급 추출
  const dustData = await safeJson(dustRes, "에어코리아 대기질 예보");
  const dustItems: DustForecastItem[] = dustData?.response?.body?.items ?? [];
  const dustByDate = new Map<string, { pm10?: string; pm25?: string }>();
  for (const item of dustItems) {
    if (!item.informData) continue;
    const dateKey = item.informData.replaceAll("-", "");
    const grade = parseInformGradeForRegion(item.informGrade, dustRegion);
    if (!grade) continue;
    let bucket = dustByDate.get(dateKey);
    if (!bucket) {
      bucket = {};
      dustByDate.set(dateKey, bucket);
    }
    // informCode: "PM10" 또는 "PM25"
    if (item.informCode === "PM10") bucket.pm10 = grade;
    else if (item.informCode === "PM25") bucket.pm25 = grade;
  }

  // 일별 예보 D+0 ~ D+6 구성
  const dailyForecast: DailyForecast[] = [];
  const todayYmd = searchDate.replaceAll("-", ""); // YYYYMMDD
  for (let d = 0; d <= 6; d++) {
    const date = addDaysYmd(todayYmd, d);
    let minTemp: string | null = null;
    let maxTemp: string | null = null;
    let dailySky: string | null = null;

    if (d <= 2) {
      // 단기예보에서 추출
      const bucket = vilageByDate.get(date);
      if (bucket) {
        minTemp = bucket.tmn ?? null;
        maxTemp = bucket.tmx ?? null;
        dailySky = skyPtyLabel(bucket.sky, bucket.pty);
      }
    } else {
      // 중기예보에서 추출 (D+3~D+7 → wf3*~wf7* / taMin3~taMax7)
      const taRow = midTaRow as Record<string, unknown>;
      const landRow = midLandRow as Record<string, unknown>;
      const rawMin = taRow[`taMin${d}`];
      const rawMax = taRow[`taMax${d}`];
      const rawSkyAm = landRow[`wf${d}Am`];
      const rawSkyPm = landRow[`wf${d}Pm`];
      minTemp = rawMin != null ? String(rawMin) : null;
      maxTemp = rawMax != null ? String(rawMax) : null;
      dailySky = normalizeMidSkyLabel(
        (typeof rawSkyAm === "string" ? rawSkyAm : null) ??
          (typeof rawSkyPm === "string" ? rawSkyPm : null),
      );
    }

    // D+0(오늘)의 기온이 단기예보에서 빠졌으면 실황 값으로 보강
    if (d === 0 && minTemp == null && weather["T1H"]) {
      // 실황엔 일최저/일최고가 없지만, 최소한 현재 기온이라도 보여줄지 결정
      // → null 유지 (정직성). 클라이언트에서 "-" 표시.
    }

    const dust = dustByDate.get(date);
    dailyForecast.push({
      date,
      minTemp,
      maxTemp,
      sky: dailySky,
      pm10Forecast: dust?.pm10 ?? null,
      pm25Forecast: dust?.pm25 ?? null,
    });
  }

  return {
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
    hourlyForecast,
    dailyForecast,
    sido: sidoName,
  };
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

  const { nx, ny } = latLngToGrid(lat, lng);
  const { base_date, base_time } = getBaseDateTime();
  const fcst = getFcstBaseDateTime();
  const vilage = getVilageFcstBaseDateTime();
  const midFcTime = getMidFcstTmFc();
  const sidoName = getSidoName(lat, lng);
  const midLandRegId = getMidLandRegId(sidoName, lng);
  const midTaRegId = getMidTaRegId(sidoName, lng);
  const dustRegion = getDustForecastRegion(sidoName, lat, lng);
  // 오늘 날짜 (KST 기준 YYYY-MM-DD)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const searchDate = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(kstNow.getUTCDate()).padStart(2, "0")}`;

  const ctx: FetchCtx = {
    nx, ny, base_date, base_time, fcst, vilage, midFcTime,
    sidoName, midLandRegId, midTaRegId, dustRegion, searchDate,
  };

  // 격자 + 권역 + 발표시각 단위로 캐시
  const cacheKey = [
    nx, ny, base_date, base_time,
    fcst.base_date, fcst.base_time,
    vilage.base_date, vilage.base_time,
    midFcTime, sidoName, dustRegion, searchDate,
  ].join(",");

  // 1) fresh 캐시가 있으면 즉시 반환
  const fresh = getFreshCache(cacheKey);
  if (fresh) {
    return NextResponse.json(fresh, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        "X-Cache": "HIT",
      },
    });
  }

  // 2) stale 캐시가 있으면 즉시 반환 + 백그라운드 갱신
  const stale = getStaleCache(cacheKey);
  if (stale) {
    if (!refreshing.has(cacheKey)) {
      refreshing.add(cacheKey);
      fetchWeatherData(ctx)
        .then((result) => { if (result) setCache(cacheKey, result); })
        .catch(() => {})
        .finally(() => refreshing.delete(cacheKey));
    }
    return NextResponse.json(stale, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        "X-Cache": "STALE",
      },
    });
  }

  // 3) 캐시 없음 — 느리더라도 무조건 대기해서 데이터 반환
  try {
    const result = await fetchWeatherData(ctx);
    if (result) {
      setCache(cacheKey, result);
      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
          "X-Cache": "MISS",
        },
      });
    }
    return NextResponse.json({ error: "no data from upstream" }, { status: 502 });
  } catch (e) {
    console.error("[weather] fetch failed", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
