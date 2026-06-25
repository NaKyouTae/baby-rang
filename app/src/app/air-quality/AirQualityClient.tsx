"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openLocationSettings } from "@/lib/openLocationSettings";
import ConfirmModal from "@/components/ConfirmModal";
import { palette } from "@/lib/colors";
import {
  GRADE_COLOR,
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
  fcstDate: string;
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
    <div className="flex flex-col bg-white">
      <header
        className="sticky top-0 z-30 bg-white flex items-center justify-center relative px-5 py-4"
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
          <div className="flex flex-col gap-4">
            {/* 실시간 대기질 */}
            <section>
              <div className="flex items-center justify-between mb-2.5 gap-3">
                <h2 className="text-[14px] font-semibold text-black shrink-0">실시간 대기질</h2>
                {(air.stationName || air.dataTime) && (
                  <span className="text-[10px] font-normal text-gray-500 flex items-center gap-1.5">
                    {air.stationName && <span>{air.stationName} 측정소</span>}
                    {air.stationName && air.dataTime && (
                      <span className="inline-block w-px h-1.5 bg-gray-200" aria-hidden />
                    )}
                    {air.dataTime && <span>{air.dataTime}</span>}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
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
            <section className="rounded-lg border border-gray-200 bg-white p-4 h-[68px]">
              <div className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSkyIcon(weather.sky, weather.pty)}
                  alt=""
                  width={36}
                  height={36}
                  className="shrink-0"
                />
                <div className="shrink-0 ml-2">
                  <p className="text-[16px] font-semibold text-black leading-none">
                    {weather.temperature ?? "-"}°
                  </p>
                  <p className="text-[10px] font-normal text-gray-500 mt-1.5 leading-none">
                    {getSkyLabel(weather.sky, weather.pty)}
                  </p>
                </div>
                <span
                  className="inline-block w-px h-9 bg-gray-200 mx-[10px]"
                  aria-hidden
                />
                <div className="flex-1 grid grid-cols-3 items-center">
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
              <section>
                <h2 className="text-[14px] font-semibold text-black mb-2.5">시간별 예보</h2>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex">
                    {/* 라벨 컬럼 (우측 정렬) */}
                    <div className="shrink-0 flex flex-col gap-2 items-end">
                      <div className="h-[10px]" />
                      <div className="h-6" />
                      <div className="h-3 flex items-center text-[10px] font-normal text-gray-500 leading-none">
                        기온
                      </div>
                      <div className="h-3 flex items-center text-[10px] font-normal text-gray-500 leading-none">
                        미세먼지
                      </div>
                      <div className="h-3 flex items-center text-[10px] font-normal text-gray-500 leading-none">
                        초미세먼지
                      </div>
                    </div>

                    {/* 라벨 우측 solid bar (1×102, gray-200) */}
                    <div className="shrink-0 mx-2 w-px h-[102px] bg-gray-200" />

                    {/* 시간 컬럼들 (가로 스크롤) */}
                    <div className="overflow-x-auto flex-1 -mr-4">
                      <div className="flex">
                        {hourly.map((h, i) => (
                          <Fragment key={`${h.fcstDate}-${h.fcstTime}`}>
                            {i > 0 && (
                              <div
                                className="shrink-0 mx-2 h-[102px] border-l border-dotted border-gray-200"
                                aria-hidden
                              />
                            )}
                            <div className="shrink-0 w-[44px] flex flex-col items-center gap-2">
                              <div className="h-[10px] flex items-center text-[10px] font-normal text-gray-500 leading-none">
                                {formatHour(h.fcstTime)}
                              </div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getSkyIcon(h.sky, h.pty)}
                                alt={getSkyLabel(h.sky, h.pty)}
                                width={24}
                                height={24}
                                className="block"
                              />
                              <div className="h-3 flex items-center text-[12px] font-normal text-black leading-none">
                                {h.temperature ?? "-"}°
                              </div>
                              <div
                                className="h-3 flex items-center text-[12px] font-normal leading-none"
                                style={{ color: gradeColor(pm10WhoGrade) }}
                              >
                                {gradeLabel(pm10WhoGrade)}
                              </div>
                              <div
                                className="h-3 flex items-center text-[12px] font-normal leading-none"
                                style={{ color: gradeColor(pm25WhoGrade) }}
                              >
                                {gradeLabel(pm25WhoGrade)}
                              </div>
                            </div>
                          </Fragment>
                        ))}
                        {/* 마지막 항목 우측 16px spacer */}
                        <div className="shrink-0 w-4" aria-hidden />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 일별 예보 */}
            {daily.length > 0 && (
              <section>
                <h2 className="text-[14px] font-semibold text-black mb-2.5">일별 예보</h2>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex">
                    {/* 날짜 컬럼 */}
                    <div className="shrink-0 flex flex-col gap-5 items-center">
                      <div className="h-3" />
                      {daily.map((d) => (
                        <div
                          key={`date-${d.date}`}
                          className="h-3 flex items-center text-[12px] font-normal text-gray-500 leading-none"
                        >
                          {formatDate(d.date)}
                        </div>
                      ))}
                    </div>

                    {/* divider */}
                    <div className="shrink-0 mx-3 border-l border-dotted border-gray-200" aria-hidden />

                    {/* 기온 컬럼 */}
                    <div className="flex-1 flex flex-col gap-5 items-center">
                      <div className="h-3 flex items-center text-[11px] font-normal text-gray-500 leading-none">
                        기온(최저/최고)
                      </div>
                      {daily.map((d) => (
                        <div
                          key={`temp-${d.date}`}
                          className="h-3 flex items-center text-[12px] font-normal text-black leading-none"
                        >
                          {d.minTemp != null && d.maxTemp != null
                            ? `${d.minTemp}°/${d.maxTemp}°`
                            : "-"}
                        </div>
                      ))}
                    </div>

                    {/* divider */}
                    <div className="shrink-0 mx-3 border-l border-dotted border-gray-200" aria-hidden />

                    {/* 미세먼지 컬럼 */}
                    <div className="flex-1 flex flex-col gap-5 items-center">
                      <div className="h-3 flex items-center text-[11px] font-normal text-gray-500 leading-none">
                        미세먼지
                      </div>
                      {daily.map((d) => {
                        const pm10g = labelToGrade(d.pm10Forecast);
                        return (
                          <div
                            key={`pm10-${d.date}`}
                            className="h-3 flex items-center text-[12px] font-normal leading-none"
                            style={{ color: gradeColor(pm10g) }}
                          >
                            {d.pm10Forecast ?? "-"}
                          </div>
                        );
                      })}
                    </div>

                    {/* divider */}
                    <div className="shrink-0 mx-3 border-l border-dotted border-gray-200" aria-hidden />

                    {/* 초미세먼지 컬럼 */}
                    <div className="flex-1 flex flex-col gap-5 items-center">
                      <div className="h-3 flex items-center text-[11px] font-normal text-gray-500 leading-none">
                        초미세먼지
                      </div>
                      {daily.map((d) => {
                        const pm25g = labelToGrade(d.pm25Forecast);
                        return (
                          <div
                            key={`pm25-${d.date}`}
                            className="h-3 flex items-center text-[12px] font-normal leading-none"
                            style={{ color: gradeColor(pm25g) }}
                          >
                            {d.pm25Forecast ?? "-"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 대기질 기준 (WHO) */}
            <section>
              <div className="flex items-center justify-between mb-2.5 gap-3">
                <h2 className="text-[14px] font-semibold text-black shrink-0">대기질 기준</h2>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <GradeTable />
              </div>
            </section>

            {/* 데이터 출처 */}
            <footer className="px-2 pb-4 pt-1 text-center">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                날씨 데이터: 기상청 단기예보 조회서비스
                <br />
                대기질 데이터: 한국환경공단 에어코리아
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
    <div className="flex flex-col items-center justify-center text-center">
      <p className="text-[12px] font-normal text-gray-500 leading-none whitespace-nowrap">
        {label}
      </p>
      <p className="text-[12px] font-medium text-black leading-none mt-2 whitespace-nowrap">
        {value}
      </p>
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-black">{label}</span>
        <span className="text-[10px] font-normal text-gray-500">{sub}</span>
      </div>
      <p className="mt-2.5 leading-none">
        <span className="text-[32px] font-black" style={{ color: gradeColor(grade) }}>
          {value ?? "-"}
        </span>
        <span className="text-[10px] font-normal text-gray-500 ml-1">{unit}</span>
      </p>
      <p className="text-[10px] font-medium mt-2" style={{ color: gradeColor(grade) }}>
        {gradeLabel(grade)}
      </p>
    </div>
  );
}

const GRADE_ROWS: { key: "1" | "2" | "3" | "4"; label: string; pm10: string; pm25: string }[] = [
  { key: "1", label: "좋음", pm10: "0~30", pm25: "0~15" },
  { key: "2", label: "보통", pm10: "31~50", pm25: "16~25" },
  { key: "3", label: "나쁨", pm10: "51~100", pm25: "26~50" },
  { key: "4", label: "매우나쁨", pm10: "101~", pm25: "51~" },
];

function GradeTable() {
  return (
    <div className="flex">
      {/* 라벨 컬럼 (우측 정렬) */}
      <div className="shrink-0 flex flex-col gap-5 items-end">
        <div className="h-3" />
        <div className="h-3 flex items-center text-[12px] font-normal text-gray-500 leading-none">
          미세먼지
        </div>
        <div className="h-3 flex items-center text-[12px] font-normal text-gray-500 leading-none">
          초미세먼지
        </div>
      </div>
      {GRADE_ROWS.map((g) => (
        <Fragment key={g.key}>
          <div
            className="shrink-0 mx-3 border-l border-dotted border-gray-200"
            aria-hidden
          />
          <div className="flex-1 flex flex-col gap-5 items-center">
            <div
              className="h-3 flex items-center text-[12px] font-semibold leading-none"
              style={{ color: GRADE_COLOR[g.key] }}
            >
              {g.label}
            </div>
            <div className="h-3 flex items-center text-[12px] font-normal text-gray-700 leading-none">
              {g.pm10}
            </div>
            <div className="h-3 flex items-center text-[12px] font-normal text-gray-700 leading-none">
              {g.pm25}
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
