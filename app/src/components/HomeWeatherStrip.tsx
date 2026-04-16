"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface WeatherAirData {
  weather: {
    temperature: string | null;
    sky: string;
    pty: string;
  };
  air: {
    pm10: string | null;
    pm25: string | null;
    pm10Grade: string | null;
    pm25Grade: string | null;
    stationName: string;
  };
}

const GRADE_LABEL: Record<string, string> = { "1": "좋음", "2": "보통", "3": "나쁨", "4": "매우나쁨" };
const GRADE_COLOR: Record<string, string> = {
  "1": "#22C55E",
  "2": "#3B82F6",
  "3": "#F97316",
  "4": "#EF4444",
};
const SKY_ICON: Record<string, string> = {
  clear: "/sun.svg",
};

function gradeLabel(grade: string | null) {
  return grade ? GRADE_LABEL[grade] ?? "-" : "-";
}
function gradeColor(grade: string | null) {
  return grade ? GRADE_COLOR[grade] ?? "#808991" : "#808991";
}
function getSkyIcon(sky: string, pty: string): string | null {
  const p = Number(pty);
  if (p >= 1) return null; // rain/snow → use emoji
  const s = Number(sky);
  if (s === 1) return SKY_ICON.clear;
  return null;
}

function getSkyEmoji(sky: string, pty: string) {
  const p = Number(pty);
  if (p === 1 || p === 5) return "🌧️";
  if (p === 2 || p === 6) return "🌨️";
  if (p === 3 || p === 7) return "❄️";
  const s = Number(sky);
  if (s === 1) return "☀️";
  if (s === 3) return "⛅";
  if (s === 4) return "☁️";
  return "☀️";
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

export default function HomeWeatherStrip() {
  const [data, setData] = useState<WeatherAirData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLoading(false);
      return;
    }

    const tryFetch = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(`/api/weather?lat=${latitude}&lng=${longitude}`);
            if (res.ok) {
              const json = await res.json();
              setData(json);
            }
          } catch {
            // silently fail
          } finally {
            setLoading(false);
          }
        },
        () => setLoading(false),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    };

    // 권한 상태 먼저 확인
    // WKWebView에서는 앱이 위치를 허용해도 permissions API가 "prompt"를 반환할 수 있으므로
    // "prompt" 상태에서도 getCurrentPosition을 호출해야 네이티브 델리게이트가 작동함
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state === "denied") setLoading(false);
        else tryFetch(); // "granted" 또는 "prompt" → 직접 요청
      });
    } else {
      tryFetch();
    }
  }, []);

  if (!data && !loading) return null;

  const weather = data?.weather;
  const air = data?.air;

  return (
    <Link href="/air-quality" className="block active:opacity-80">
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-5">
        <div className="flex items-center">
          {/* 날씨 아이콘 + 온도 */}
          <div className="flex items-center gap-2.5 shrink-0">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
            ) : getSkyIcon(weather!.sky, weather!.pty) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getSkyIcon(weather!.sky, weather!.pty)!} alt="" width={36} height={36} />
            ) : (
              <span className="text-[36px] leading-none">
                {getSkyEmoji(weather!.sky, weather!.pty)}
              </span>
            )}
            <div>
              {loading ? (
                <>
                  <div className="w-10 h-4 rounded bg-gray-200 animate-pulse" />
                  <div className="w-8 h-2.5 rounded bg-gray-200 animate-pulse mt-1" />
                </>
              ) : (
                <>
                  <p className="text-[16px] font-semibold text-black leading-tight">
                    {weather!.temperature ?? "-"}°
                  </p>
                  <p className="text-[10px] font-normal text-gray-500 mt-1">
                    {getSkyLabel(weather!.sky, weather!.pty)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 구분선 */}
          <div className="w-px h-12 bg-gray-200 mx-4" />

          {/* 미세먼지 */}
          <div className="flex-1 flex gap-4">
            <div className="flex-1 text-center">
              {loading ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-3 rounded bg-gray-200 animate-pulse" />
                  <div className="w-8 h-3 rounded bg-gray-200 animate-pulse" />
                  <div className="w-14 h-2.5 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-medium text-black">미세먼지</p>
                  <p
                    className="text-[12px] font-semibold mt-1"
                    style={{ color: gradeColor(air!.pm10Grade) }}
                  >
                    {gradeLabel(air!.pm10Grade)}
                  </p>
                  <p className="text-[10px] font-normal text-gray-500 mt-1">{air!.pm10 ?? "-"}㎍/㎥</p>
                </>
              )}
            </div>
            <div className="flex-1 text-center">
              {loading ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-14 h-3 rounded bg-gray-200 animate-pulse" />
                  <div className="w-8 h-3 rounded bg-gray-200 animate-pulse" />
                  <div className="w-14 h-2.5 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-medium text-black">초미세먼지</p>
                  <p
                    className="text-[12px] font-semibold mt-1"
                    style={{ color: gradeColor(air!.pm25Grade) }}
                  >
                    {gradeLabel(air!.pm25Grade)}
                  </p>
                  <p className="text-[10px] font-normal text-gray-500 mt-1">{air!.pm25 ?? "-"}㎍/㎥</p>
                </>
              )}
            </div>
          </div>

          {/* 화살표 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arrow-right-linear.svg" alt="" width={12} height={12} className="shrink-0 ml-2" />
        </div>
      </div>
    </Link>
  );
}
