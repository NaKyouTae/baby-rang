"use client";

import { useEffect, useState } from "react";
import { openLocationSettings, getLocationSettingsGuide } from "@/lib/openLocationSettings";
import ConfirmModal from "@/components/ConfirmModal";

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

type LocStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

const GRADE_LABEL: Record<string, string> = { "1": "좋음", "2": "보통", "3": "나쁨", "4": "매우나쁨" };
const GRADE_COLOR: Record<string, string> = {
  "1": "#339AF0",
  "2": "#3078C9",
  "3": "#FF922B",
  "4": "#FF3B30",
};
const GRADE_BG: Record<string, string> = {
  "1": "#EDF5FF",
  "2": "#E6F7F9",
  "3": "#FFF4E6",
  "4": "#FFEFEE",
};

function gradeLabel(grade: string | null) {
  return grade ? GRADE_LABEL[grade] ?? "-" : "-";
}
function gradeColor(grade: string | null) {
  return grade ? GRADE_COLOR[grade] ?? "#808991" : "#808991";
}
function gradeBg(grade: string | null) {
  return grade ? GRADE_BG[grade] ?? "#F7F8F9" : "#F7F8F9";
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

function getOutdoorAdvice(pm10Grade: string | null, pm25Grade: string | null) {
  const worst = Math.max(Number(pm10Grade ?? 1), Number(pm25Grade ?? 1));
  if (worst <= 1) return { text: "외출하기 좋은 날이에요!", color: "#339AF0" };
  if (worst === 2) return { text: "외출 가능하지만 민감한 아이는 주의하세요.", color: "#3078C9" };
  if (worst === 3) return { text: "외출을 자제하고, 외출 시 마스크를 착용하세요.", color: "#FF922B" };
  return { text: "외출을 삼가고 실내 활동을 권장합니다.", color: "#FF3B30" };
}

export default function AirQualityClient() {
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [air, setAir] = useState<AirData | null>(null);
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

  const advice = getOutdoorAdvice(air?.pm10Grade ?? null, air?.pm25Grade ?? null);

  return (
    <div className="flex flex-col min-h-dvh bg-gray-100">
      <main
        className="flex-1 px-4"
        style={{
          paddingTop: "calc(var(--safe-area-top) + 20px)",
          paddingBottom: "var(--bottom-nav-space)",
        }}
      >
        {/* 헤더 */}
        <h1 className="text-[20px] font-bold text-app-black mb-4 px-2">미세먼지</h1>

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
            {/* 날씨 카드 */}
            <section className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-bold text-app-black">현재 날씨</h2>
                {air.stationName && (
                  <span className="text-[12px] text-gray-500">{air.stationName} 측정소</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getSkyIcon(weather.sky, weather.pty)} alt="" width={48} height={48} />
                <div>
                  <p className="text-[32px] font-bold text-app-black leading-tight">
                    {weather.temperature ?? "-"}°
                  </p>
                  <p className="text-[14px] text-gray-500 mt-1">
                    {getSkyLabel(weather.sky, weather.pty)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <InfoChip label="습도" value={weather.humidity ? `${weather.humidity}%` : "-"} />
                <InfoChip label="풍속" value={weather.windSpeed ? `${weather.windSpeed}m/s` : "-"} />
                <InfoChip
                  label="강수"
                  value={
                    weather.rainfall && weather.rainfall !== "0"
                      ? `${weather.rainfall}mm`
                      : "없음"
                  }
                />
              </div>
            </section>

            {/* 외출 가이드 */}
            <section
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ backgroundColor: advice.color + "10" }}
            >
              <span className="text-[24px]">👶</span>
              <p className="text-[14px] font-semibold" style={{ color: advice.color }}>
                {advice.text}
              </p>
            </section>

            {/* 미세먼지 카드 */}
            <section className="bg-white rounded-2xl p-5">
              <h2 className="text-[16px] font-bold text-app-black mb-4">대기질</h2>
              <div className="grid grid-cols-2 gap-3">
                <DustCard
                  label="미세먼지"
                  sub="PM10"
                  value={air.pm10}
                  unit="㎍/㎥"
                  grade={air.pm10Grade}
                />
                <DustCard
                  label="초미세먼지"
                  sub="PM2.5"
                  value={air.pm25}
                  unit="㎍/㎥"
                  grade={air.pm25Grade}
                />
              </div>
              {air.khaiValue && (
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="text-[13px] text-gray-500">통합대기환경지수</span>
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: gradeColor(air.khaiGrade) }}
                  >
                    {air.khaiValue} ({gradeLabel(air.khaiGrade)})
                  </span>
                </div>
              )}
            </section>

            {/* 기준 안내 */}
            <section className="bg-white rounded-2xl p-5">
              <h2 className="text-[16px] font-bold text-app-black mb-3">대기질 기준</h2>
              <div className="space-y-2">
                <GradeRow label="좋음" pm10="0~30" pm25="0~15" grade="1" />
                <GradeRow label="보통" pm10="31~80" pm25="16~35" grade="2" />
                <GradeRow label="나쁨" pm10="81~150" pm25="36~75" grade="3" />
                <GradeRow label="매우나쁨" pm10="151~" pm25="76~" grade="4" />
              </div>
            </section>

            {/* 데이터 출처 */}
            <footer className="px-2 pb-4 text-center">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                날씨 데이터: 기상청 단기예보 조회서비스
                <br />
                대기질 데이터: 한국환경공단 에어코리아
                <br />
                {air.dataTime && (
                  <span className="text-gray-300">측정 시간: {air.dataTime}</span>
                )}
              </p>
            </footer>
          </div>
        )}
      </main>

      <ConfirmModal
        open={guideModal}
        title="위치 권한 설정"
        description={typeof window !== "undefined" ? getLocationSettingsGuide().description : "설정에서 위치 권한을 허용해주세요."}
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

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-center">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-[13px] font-semibold text-app-black mt-0.5">{value}</p>
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
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] text-gray-600">{label}</span>
        <span className="text-[11px] text-gray-400">{sub}</span>
      </div>
      <p className="text-[28px] font-bold leading-tight" style={{ color: gradeColor(grade) }}>
        {value ?? "-"}
        <span className="text-[12px] font-normal text-gray-400 ml-1">{unit}</span>
      </p>
      <p className="text-[13px] font-semibold mt-1" style={{ color: gradeColor(grade) }}>
        {gradeLabel(grade)}
      </p>
    </div>
  );
}

function GradeRow({
  label,
  pm10,
  pm25,
  grade,
}: {
  label: string;
  pm10: string;
  pm25: string;
  grade: string;
}) {
  return (
    <div className="flex items-center text-[12px] gap-2">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: GRADE_COLOR[grade] }}
      />
      <span className="font-semibold w-16" style={{ color: GRADE_COLOR[grade] }}>
        {label}
      </span>
      <span className="text-gray-500 flex-1">PM10: {pm10}</span>
      <span className="text-gray-500 flex-1">PM2.5: {pm25}</span>
    </div>
  );
}
