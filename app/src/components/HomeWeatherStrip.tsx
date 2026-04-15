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
  "1": "#339AF0",
  "2": "#30B0C7",
  "3": "#FF922B",
  "4": "#FF3B30",
};

function gradeLabel(grade: string | null) {
  return grade ? GRADE_LABEL[grade] ?? "-" : "-";
}
function gradeColor(grade: string | null) {
  return grade ? GRADE_COLOR[grade] ?? "#808991" : "#808991";
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
  const [locationName, setLocationName] = useState<string>("");

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
              setLocationName(json.air?.stationName ?? "");
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

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="w-24 h-3 rounded bg-gray-200" />
            <div className="w-40 h-3 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { weather, air } = data;

  return (
    <Link href="/air-quality" className="block active:opacity-80">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {/* 날씨 아이콘 + 온도 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[28px] leading-none">
              {getSkyEmoji(weather.sky, weather.pty)}
            </span>
            <div>
              <p className="text-[20px] font-bold text-app-black leading-tight">
                {weather.temperature ?? "-"}°
              </p>
              <p className="text-[11px] text-gray-500">
                {getSkyLabel(weather.sky, weather.pty)}
              </p>
            </div>
          </div>

          {/* 구분선 */}
          <div className="w-px h-10 bg-gray-200 mx-1" />

          {/* 미세먼지 */}
          <div className="flex-1 flex gap-3">
            <div className="flex-1 text-center">
              <p className="text-[11px] text-gray-500">미세먼지</p>
              <p className="text-[14px] font-bold mt-0.5" style={{ color: gradeColor(air.pm10Grade) }}>
                {gradeLabel(air.pm10Grade)}
              </p>
              <p className="text-[10px] text-gray-400">{air.pm10 ?? "-"}㎍/㎥</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[11px] text-gray-500">초미세먼지</p>
              <p className="text-[14px] font-bold mt-0.5" style={{ color: gradeColor(air.pm25Grade) }}>
                {gradeLabel(air.pm25Grade)}
              </p>
              <p className="text-[10px] text-gray-400">{air.pm25 ?? "-"}㎍/㎥</p>
            </div>
          </div>

          {/* 화살표 */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-gray-400">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {locationName && (
          <p className="text-[10px] text-gray-400 mt-2 text-right">{locationName} 측정소 기준</p>
        )}
      </div>
    </Link>
  );
}
