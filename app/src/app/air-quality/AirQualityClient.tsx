"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openLocationSettings } from "@/lib/openLocationSettings";
import ConfirmModal from "@/components/ConfirmModal";
import { palette } from "@/lib/colors";
import {
  GRADE_COLOR,
  gradeBg,
  gradeColor,
  gradeLabel,
  whoGradePm10,
  whoGradePm25,
} from "@/lib/airQualityGrade";

interface WeatherData {
  temperature: string | null;
  humidity: string | null;
  rainfall: string | null;
  windSpeed: string | null;
  sky: string;
  pty: string;
}

interface AirData {
  pm10: string | null;
  pm25: string | null;
  pm10Grade: string | null;
  pm25Grade: string | null;
  khaiValue: string | null;
  khaiGrade: string | null;
  stationName: string;
  dataTime: string | null;
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
  sky: string | null;
  pm10Forecast: string | null;
  pm25Forecast: string | null;
}

type LocStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

const LABEL_TO_GRADE: Record<string, string> = {
  "좋음": "1",
  "보통": "2",
  "나쁨": "3",
  "매우나쁨": "4",
};

function labelToGrade(label: string | null): string | null {
  if (!label) return null;
  return LABEL_TO_GRADE[label] ?? null;
}

function formatDate(yyyymmdd: string): string {
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  return `${m}월 ${d}일`;
}

function getSkyLabel(sky: string, pty: string) {
  const p = Number(pty);
  if (p === 1 || p === 5) return "비";
  if (p === 2 || p === 6) return "비/눈";
  if (p === 3 || p === 7) return "눈";
  const s = Number(sky);
  if (s === 1) return "맑음";
  if (s === 3) return "구름많음";
  if (s === 4) return "흐림";
  return "맑음";
}

function getSkyIcon(sky: string, pty: string): string {
  const p = Number(pty);
  if (p === 1 || p === 5) return "/rain-cloud.svg";
  if (p === 2 || p === 6) return "/rain-snow.svg";
  if (p === 3 || p === 7) return "/snow.svg";
  const s = Number(sky);
  if (s === 3) return "/sun-cloud.svg";
  if (s === 4) return "/cloud.svg";
  return "/sun.svg";
}

function formatHour(fcstTime: string): string {
  return `${Number(fcstTime.slice(0, 2))}시`;
}

const HOUR_GRID = "grid-cols-[56px_repeat(4,1fr)]";

export default function AirQualityClient() {
  const router = useRouter();
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [guideModal, setGuideModal] = useState(false);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocStatus("granted");
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const fetchWeather = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setWeather(data.weather);
      setAir(data.air);
      setHourly(data.hourlyForecast ?? []);
      setDaily(data.dailyForecast ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      requestLocation();
      return;
    }
    navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
      if (result.state === "granted") requestLocation();
      else if (result.state === "denied") setLocStatus("denied");
      else requestLocation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pm10WhoGrade = whoGradePm10(air?.pm10 ?? null);
  const pm25WhoGrade = whoGradePm25(air?.pm25 ?? null);

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <header
        className="flex items-center justify-center relative px-5 py-4"
        style={{ paddingTop: "calc(var(--safe-area-top) + 16px)" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="absolute left-4 flex h-9 w-9 items-center justify-center"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={palette.black}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[16px] font-medium text-black">미세먼지</h1>
      </header>

      <main
        className="flex-1 px-4"
        style={{ paddingBottom: "var(--bottom-nav-space)" }}
      >
        {locStatus === "denied" && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-[15px] text-gray-600 mb-4">
              위치 권한을 허용하면<br />내 주변 날씨와 미세먼지를 확인할 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => setGuideModal(true)}
              className="px-6 py-3 rounded-xl bg-primary-500 text-white text-[14px] font-semibold"
            >
              위치 권한 허용하기
            </button>
          </div>
        )}

        {(locStatus === "loading" || loading) && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-200" />
              <div className="w-32 h-4 rounded bg-gray-200" />
              <div className="w-48 h-3 rounded bg-gray-200" />
            </div>
          </div>
        )}

        {weather && air && !loading && (
          <div className="flex flex-col gap-3">
            {/* 실시간 대기질 */}
            <section className="bg-white rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3 gap-3">
                <h2 className="text-[15px] font-bold text-app-black shrink-0">실시간 대기질</h2>
                {(air.stationName || air.dataTime) && (
                  <span className="text-[11px] text-gray-500 text-right leading-tight">
                    {air.stationName && <>{air.stationName} 측정소</>}
                    {air.dataTime && (
                      <>
                        {" "}
                        <span className="text-gray-400">{air.dataTime}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DustCard
                  label="미세먼지"
                  sub="PM10"
                  value={air.pm10}
                  unit="㎍/㎥"
                  grade={pm10WhoGrade}
                />
                <DustCard
                  label="초미세먼지"
                  sub="PM2.5"
                  value={air.pm25}
                  unit="㎍/㎥"
                  grade={pm25WhoGrade}
                />
              </div>
            </section>

            {/* 날씨 strip */}
            <section className="bg-white rounded-2xl px-5 py-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSkyIcon(weather.sky, weather.pty)}
                  alt=""
                  width={36}
                  height={36}
                  className="shrink-0"
                />
                <div className="shrink-0">
                  <p className="text-[18px] font-bold text-app-black leading-none">
                    {weather.temperature ?? "-"}°
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-none">
                    {getSkyLabel(weather.sky, weather.pty)}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <WeatherStat label="습도" value={weather.humidity ? `${weather.humidity}%` : "-"} />
                  <WeatherStat label="풍속" value={weather.windSpeed ? `${weather.windSpeed}m/s` : "-"} />
                  <WeatherStat
                    label="강수"
                    value={
                      weather.rainfall && weather.rainfall !== "0"
                        ? `${weather.rainfall}mm`
                        : "없음"
                    }
                  />
                </div>
              </div>
            </section>

            {/* 시간별 예보 */}
            {hourly.length > 0 && (
              <section className="bg-white rounded-2xl p-5">
                <h2 className="text-[15px] font-bold text-app-black mb-4">시간별 예보</h2>

                {/* 시간 */}
                <div className={`grid ${HOUR_GRID} items-center gap-1 text-[12px] text-gray-500`}>
                  <div />
                  {hourly.map((h) => (
                    <div key={`t-${h.fcstTime}`} className="text-center">
                      {formatHour(h.fcstTime)}
                    </div>
                  ))}
                </div>

                {/* 아이콘 */}
                <div className={`grid ${HOUR_GRID} items-center gap-1 mt-2`}>
                  <div />
                  {hourly.map((h) => (
                    <div key={`i-${h.fcstTime}`} className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getSkyIcon(h.sky, h.pty)}
                        alt={getSkyLabel(h.sky, h.pty)}
                        width={28}
                        height={28}
                      />
                    </div>
                  ))}
                </div>

                {/* 기온 */}
                <HourRow label="기온">
                  {hourly.map((h) => (
                    <div key={`temp-${h.fcstTime}`} className="text-center text-app-black">
                      {h.temperature ?? "-"}°
                    </div>
                  ))}
                </HourRow>

                {/* 미세먼지 (현재 측정값 기준) */}
                <HourRow label="미세먼지">
                  {hourly.map((h) => (
                    <div
                      key={`pm10-${h.fcstTime}`}
                      className="text-center font-semibold"
                      style={{ color: gradeColor(pm10WhoGrade) }}
                    >
                      {gradeLabel(pm10WhoGrade)}
                    </div>
                  ))}
                </HourRow>

                {/* 초미세먼지 (현재 측정값 기준) */}
                <HourRow label="초미세먼지" last>
                  {hourly.map((h) => (
                    <div
                      key={`pm25-${h.fcstTime}`}
                      className="text-center font-semibold"
                      style={{ color: gradeColor(pm25WhoGrade) }}
                    >
                      {gradeLabel(pm25WhoGrade)}
                    </div>
                  ))}
                </HourRow>

                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                  ※ 미세먼지·초미세먼지는 현재 측정값 기준이에요.
                </p>
              </section>
            )}

            {/* 일별 예보 */}
            {daily.length > 0 && (
              <section className="bg-white rounded-2xl p-5">
                <h2 className="text-[15px] font-bold text-app-black mb-4">일별 예보</h2>

                {/* 헤더 */}
                <div className="grid grid-cols-[58px_1.4fr_1fr_1fr] gap-1 pb-2 border-b border-gray-100 text-[11px] text-gray-500">
                  <div />
                  <div className="text-center">기온(최저/최고)</div>
                  <div className="text-center">미세먼지</div>
                  <div className="text-center">초미세먼지</div>
                </div>

                {/* 데이터 행 */}
                {daily.map((d, idx) => {
                  const pm10g = labelToGrade(d.pm10Forecast);
                  const pm25g = labelToGrade(d.pm25Forecast);
                  return (
                    <div
                      key={d.date}
                      className={`grid grid-cols-[58px_1.4fr_1fr_1fr] gap-1 items-center py-2.5 text-[12px]${
                        idx === daily.length - 1 ? "" : " border-b border-gray-50"
                      }`}
                    >
                      <div className="text-gray-600">{formatDate(d.date)}</div>
                      <div className="text-center text-app-black">
                        {d.minTemp != null && d.maxTemp != null
                          ? `${d.minTemp}°/${d.maxTemp}°`
                          : "-"}
                      </div>
                      <div
                        className="text-center font-semibold"
                        style={{ color: gradeColor(pm10g) }}
                      >
                        {d.pm10Forecast ?? "-"}
                      </div>
                      <div
                        className="text-center font-semibold"
                        style={{ color: gradeColor(pm25g) }}
                      >
                        {d.pm25Forecast ?? "-"}
                      </div>
                    </div>
                  );
                })}

                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                  ※ 미세먼지 예보는 환경부 기준으로 모레까지 제공돼요.
                </p>
              </section>
            )}

            {/* 대기질 기준 (WHO) */}
            <section className="bg-white rounded-2xl p-5">
              <div className="flex items-end justify-between mb-3">
                <h2 className="text-[15px] font-bold text-app-black">대기질 기준</h2>
                <span className="text-[11px] text-gray-400">WHO 기준 · ㎍/㎥</span>
              </div>
              <GradeTable />
            </section>

            {/* 데이터 출처 */}
            <footer className="px-2 pb-4 pt-1 text-center">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                날씨 데이터: 기상청 단기예보 조회서비스
                <br />
                대기질 데이터: 한국환경공단 에어코리아
                <br />
                대기질 등급: WHO 2021 가이드라인 기준
              </p>
            </footer>
          </div>
        )}
      </main>

      <ConfirmModal
        open={guideModal}
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
              <path d="M2.66675 6.76201C2.66675 3.76401 5.05475 1.33334 8.00008 1.33334C10.9454 1.33334 13.3334 3.76401 13.3334 6.76201C13.3334 9.73668 11.6314 13.2087 8.97542 14.4493C8.67014 14.5923 8.33717 14.6664 8.00008 14.6664C7.66299 14.6664 7.33003 14.5923 7.02475 14.4493C4.36875 13.208 2.66675 9.73734 2.66675 6.76268V6.76201Z" stroke="black"/>
              <path d="M8 8.66669C9.10457 8.66669 10 7.77126 10 6.66669C10 5.56212 9.10457 4.66669 8 4.66669C6.89543 4.66669 6 5.56212 6 6.66669C6 7.77126 6.89543 8.66669 8 8.66669Z" stroke="black"/>
            </svg>
          </div>
        }
        title="위치 권한 변경"
        description={"위치 권한을 변경해주세요.\n설정에서 위치 권한을 변경할 수 있어요."}
        confirmLabel="설정으로 이동"
        onConfirm={() => {
          openLocationSettings();
          setGuideModal(false);
        }}
        onClose={() => setGuideModal(false)}
      />
    </div>
  );
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500 leading-none">{label}</p>
      <p className="text-[13px] font-semibold text-app-black leading-none mt-1.5">{value}</p>
    </div>
  );
}

function HourRow({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid ${HOUR_GRID} items-center gap-1 text-[12px] py-2.5 mt-1${
        last ? "" : " border-b border-gray-50"
      }`}
    >
      <div className="text-gray-500">{label}</div>
      {children}
    </div>
  );
}

function DustCard({
  label,
  sub,
  value,
  unit,
  grade,
}: {
  label: string;
  sub: string;
  value: string | null;
  unit: string;
  grade: string | null;
}) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: gradeBg(grade) }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-gray-600">{label}</span>
        <span className="text-[11px] text-gray-400">{sub}</span>
      </div>
      <p className="leading-tight" style={{ color: gradeColor(grade) }}>
        <span className="text-[28px] font-bold">{value ?? "-"}</span>
        <span className="text-[12px] font-normal text-gray-400 ml-1">{unit}</span>
      </p>
      <p className="text-[13px] font-semibold mt-0.5" style={{ color: gradeColor(grade) }}>
        {gradeLabel(grade)}
      </p>
    </div>
  );
}

function GradeTable() {
  return (
    <div className="text-[12px]">
      <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1 pb-2 border-b border-gray-100">
        <div />
        <div className="text-center font-semibold" style={{ color: GRADE_COLOR["1"] }}>좋음</div>
        <div className="text-center font-semibold" style={{ color: GRADE_COLOR["2"] }}>보통</div>
        <div className="text-center font-semibold" style={{ color: GRADE_COLOR["3"] }}>나쁨</div>
        <div className="text-center font-semibold" style={{ color: GRADE_COLOR["4"] }}>매우나쁨</div>
      </div>
      <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1 py-2.5 border-b border-gray-100 items-center">
        <div className="text-gray-500">미세먼지</div>
        <div className="text-center text-gray-700">0~30</div>
        <div className="text-center text-gray-700">31~50</div>
        <div className="text-center text-gray-700">51~100</div>
        <div className="text-center text-gray-700">101~</div>
      </div>
      <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1 pt-2.5 items-center">
        <div className="text-gray-500">초미세먼지</div>
        <div className="text-center text-gray-700">0~15</div>
        <div className="text-center text-gray-700">16~25</div>
        <div className="text-center text-gray-700">26~50</div>
        <div className="text-center text-gray-700">51~</div>
      </div>
    </div>
  );
}
