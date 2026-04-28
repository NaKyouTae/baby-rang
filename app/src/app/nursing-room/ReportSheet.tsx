"use client";

import { useEffect, useRef, useState } from "react";
import { palette } from "@/lib/colors";

export interface NursingRoomReport {
  name: string;
  type: string; // 가족수유실 / 모유수유실 / 기저귀교환대 / 기타
  sido: string;
  sigungu: string;
  roadAddress: string;
  detailLocation: string; // 건물 내 상세 위치 (예: 3층 화장실 옆)
  tel?: string;
  dadAvailable: boolean;
  facilities: string[]; // 편의시설 체크리스트
  openHours?: string;
  notes?: string;
  reporterName?: string;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
}

const ROOM_TYPES = ["가족수유실", "모유수유실", "기저귀갈이대", "기타"];
const FACILITIES = [
  "기저귀교환대",
  "전자레인지",
  "정수기",
  "세면대",
  "잠금장치",
  "모유 수유 쿠션",
  "기저귀",
  "물티슈",
];

interface Props {
  onClose: () => void;
  onSubmit: (report: NursingRoomReport) => void;
}

export default function ReportSheet({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState<NursingRoomReport>({
    name: "",
    type: "가족수유실",
    sido: "",
    sigungu: "",
    roadAddress: "",
    detailLocation: "",
    tel: "",
    dadAvailable: false,
    facilities: [],
    openHours: "",
    notes: "",
    reporterName: "",
    lat: null,
    lng: null,
    createdAt: new Date().toISOString(),
  });

  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerMapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps marker ref
  const pickerMarkerRef = useRef<any>(null);
  const pickedRef = useRef<{ lat: number; lng: number } | null>(null);

  const [scriptReady, setScriptReady] = useState(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- daum postcode SDK global
    typeof window !== "undefined" && !!(window as any).daum?.Postcode,
  );

  // 시트가 열리자마자 Postcode 스크립트 프리로드
  useEffect(() => {
    if (scriptReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- daum postcode SDK global
    if ((window as any).daum?.Postcode) {
      setScriptReady(true);
      return;
    }
    const existing = document.getElementById(
      "daum-postcode-script",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src =
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setSearchError("우편번호 서비스 로드 실패");
    document.head.appendChild(script);
  }, [scriptReady]);

  const handleComplete = async (data: Record<string, string>) => {
    setPostcodeOpen(false);
    const roadAddress: string = data.roadAddress || data.address || "";
    const sido: string = data.sido || "";
    const sigungu: string = data.sigungu || "";
    const buildingName: string = data.buildingName || "";

    setForm((s) => ({
      ...s,
      name: s.name || buildingName || "",
      sido,
      sigungu,
      roadAddress,
      lat: null,
      lng: null,
    }));

    setResolving(true);
    const jibunAddress: string =
      data.jibunAddress || data.autoJibunAddress || "";
    const candidates = [roadAddress, jibunAddress, buildingName].filter(Boolean);
    let found: { lat: number; lng: number } | null = null;
    try {
      for (const q of candidates) {
        const res = await fetch(
          `/api/nursing-rooms/geocode?query=${encodeURIComponent(q)}`,
        );
        const json = await res.json();
        const top = json.items?.[0];
        if (top && typeof top.lat === "number" && typeof top.lng === "number") {
          found = { lat: top.lat, lng: top.lng };
          break;
        }
      }
      if (found) {
        setForm((s) => ({ ...s, lat: found!.lat, lng: found!.lng }));
      } else {
        setSearchError("좌표를 찾을 수 없어요. 다른 주소를 시도해주세요.");
      }
    } catch {
      setSearchError("좌표 변환에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setResolving(false);
    }
  };

  // 오버레이가 열리고 ref가 붙은 뒤 embed
  useEffect(() => {
    if (!postcodeOpen) return;
    if (!scriptReady) return;
    if (!postcodeRef.current) return;
    postcodeRef.current.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- daum postcode SDK global
    new (window as any).daum.Postcode({
      width: "100%",
      height: "100%",
      oncomplete: handleComplete,
    }).embed(postcodeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postcodeOpen, scriptReady]);

  const openPostcode = () => {
    setSearchError(null);
    setPostcodeOpen(true);
  };

  // 지도 피커: 열리면 네이버 지도 초기화 + 드래그 가능 마커
  useEffect(() => {
    if (!pickerOpen) return;
    if (!pickerMapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps SDK global
    if (typeof window === "undefined" || !(window as any).naver?.maps) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps SDK global
    const naverNs = (window as any).naver;
    const initLat = form.lat ?? 37.5666;
    const initLng = form.lng ?? 126.9784;

    const map = new naverNs.maps.Map(pickerMapRef.current, {
      center: new naverNs.maps.LatLng(initLat, initLng),
      zoom: 17,
      zoomControl: false,
    });

    const marker = new naverNs.maps.Marker({
      position: new naverNs.maps.LatLng(initLat, initLng),
      map,
      draggable: true,
      icon: {
        content: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:${palette.black};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.4);border:2px solid white;">
          <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
        </div>`,
        anchor: new naverNs.maps.Point(18, 36),
      },
    });
    pickerMarkerRef.current = marker;
    pickedRef.current = { lat: initLat, lng: initLng };

    naverNs.maps.Event.addListener(marker, "dragend", () => {
      const pos = marker.getPosition();
      pickedRef.current = { lat: pos.y, lng: pos.x };
    });

    naverNs.maps.Event.addListener(map, "click", (e: { coord: { y: number; x: number } }) => {
      marker.setPosition(e.coord);
      pickedRef.current = { lat: e.coord.y, lng: e.coord.x };
    });

    return () => {
      marker.setMap(null);
      map.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  const confirmPickedLocation = () => {
    if (pickedRef.current) {
      setForm((s) => ({
        ...s,
        lat: pickedRef.current!.lat,
        lng: pickedRef.current!.lng,
      }));
    }
    setPickerOpen(false);
  };

  const toggleFacility = (f: string) => {
    setForm((s) => ({
      ...s,
      facilities: s.facilities.includes(f)
        ? s.facilities.filter((x) => x !== f)
        : [...s.facilities, f],
    }));
  };

  const canSubmit =
    !!form.name.trim() &&
    !!form.roadAddress.trim() &&
    form.lat != null &&
    form.lng != null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ ...form, createdAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-[24px] shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100dvh - 172px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 지도 피커 오버레이 */}
        {pickerOpen && (
          <div className="absolute inset-0 z-20 bg-white rounded-t-3xl flex flex-col">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-600 -ml-1"
                aria-label="뒤로"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h3 className="text-base font-semibold text-gray-900">
                지도에서 위치 찾기
              </h3>
            </div>
            <div className="px-4 py-2 text-[11px] text-gray-500 bg-gray-50 border-b border-gray-100">
              지도를 탭하거나 마커를 드래그해서 수유실 위치를 조정하세요.
            </div>
            <div ref={pickerMapRef} className="flex-1" />
            <div
              className="px-4 pt-3 border-t border-gray-100"
              style={{
                paddingBottom:
                  "calc(var(--safe-area-bottom) + 12px)",
              }}
            >
              <button
                type="button"
                onClick={confirmPickedLocation}
                className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-semibold text-sm"
              >
                이 위치로 저장
              </button>
            </div>
          </div>
        )}

        {/* 주소 검색 오버레이 (모바일 전체화면) */}
        {postcodeOpen && (
          <div className="absolute inset-0 z-10 bg-white rounded-t-3xl flex flex-col">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setPostcodeOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-600 -ml-1"
                aria-label="뒤로"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h3 className="text-base font-semibold text-gray-900">주소 검색</h3>
            </div>
            <div ref={postcodeRef} className="flex-1 overflow-hidden" />
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 h-[52px] min-h-[52px] shrink-0">
          <h2 className="text-base font-medium text-black">수유실 제보하기</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5l10 10" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* 내용 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <Field label="수유실 이름" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: ○○백화점 본점 수유실"
              className="w-full px-3 py-2.5 rounded-[4px] border border-gray-200 text-sm focus:outline-none focus:border-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm"
            />
          </Field>

          <Field label="종류" required>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 h-7 rounded-[20px] text-xs border ${
                    form.type === t
                      ? "bg-primary-500 text-white font-medium border-primary-500"
                      : "bg-white text-gray-400 font-normal border-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="주소" required>
            <button
              type="button"
              onClick={openPostcode}
              className="w-full px-3 py-2.5 rounded-[4px] border border-gray-200 text-sm text-left flex items-center gap-2 hover:border-gray-900"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span className={form.roadAddress ? "text-gray-900 text-sm" : "text-gray-400 font-normal text-sm"}>
                {form.roadAddress || "주소 검색"}
              </span>
            </button>
            {resolving && (
              <p className="mt-1.5 text-xs text-gray-400">좌표를 확인하는 중...</p>
            )}
            {searchError && (
              <p className="mt-1.5 text-xs text-red-500">{searchError}</p>
            )}
            <button
              type="button"
              onClick={() => {
                if (form.lat == null || form.lng == null) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setForm((s) => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                      setPickerOpen(true);
                    },
                    () => {
                      // 위치 권한 거부 시 기본 좌표(서울)로 열기
                      setForm((s) => ({ ...s, lat: s.lat ?? 37.5666, lng: s.lng ?? 126.9784 }));
                      setPickerOpen(true);
                    },
                    { enableHighAccuracy: true, timeout: 5000 },
                  );
                } else {
                  setPickerOpen(true);
                }
              }}
              className="mt-2 w-full px-3 py-2.5 rounded-[4px] border border-gray-900 bg-gray-100 text-gray-900 text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              지도에서 정확한 위치 찾기
            </button>
          </Field>

          <Field label="상세 위치">
            <input
              type="text"
              value={form.detailLocation}
              onChange={(e) => setForm({ ...form, detailLocation: e.target.value })}
              placeholder="본점 4층 여자화장실 옆, 103동 1층 로비 등"
              className="w-full px-3 py-2.5 rounded-[4px] border border-gray-200 text-sm focus:outline-none focus:border-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm"
            />
          </Field>

          <Field label="편의시설">
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((f) => {
                const on = form.facilities.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFacility(f)}
                    className={`px-3 h-7 rounded-[20px] text-xs border ${
                      on
                        ? "bg-primary-500 text-white font-medium border-primary-500"
                        : "bg-white text-gray-400 font-normal border-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="이용 시간">
            <input
              type="text"
              value={form.openHours}
              onChange={(e) => setForm({ ...form, openHours: e.target.value })}
              placeholder="평일 10:00 ~ 20:00 등"
              className="w-full px-3 py-2.5 rounded-[4px] border border-gray-200 text-sm focus:outline-none focus:border-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm"
            />
          </Field>

          <Field label="기타">
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="청결도, 분위기, 주의사항 등을 자유롭게 적어주세요"
              className="w-full px-3 py-2.5 rounded-[4px] border border-gray-200 text-sm focus:outline-none focus:border-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm"
            />
          </Field>

        </div>

        {/* 푸터 */}
        <div
          className="px-4 pt-0"
          style={{ paddingBottom: "calc(var(--safe-area-bottom) + 16px)" }}
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-[4px] bg-primary-500 text-white font-semibold text-base disabled:bg-gray-200 disabled:text-gray-400"
          >
            제보하기
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
