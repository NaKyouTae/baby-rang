"use client";

import { useEffect, useRef, useState } from "react";

export interface NursingRoomReport {
  name: string;
  type: string; // 가족수유실 / 모유수유실 / 착유실 / 기저귀교환대 / 기타
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

const ROOM_TYPES = ["가족수유실", "모유수유실", "착유실", "기저귀교환대", "기타"];
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
  const pickerMarkerRef = useRef<any>(null);
  const pickedRef = useRef<{ lat: number; lng: number } | null>(null);

  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" && !!(window as any).daum?.Postcode,
  );

  // 시트가 열리자마자 Postcode 스크립트 프리로드
  useEffect(() => {
    if (scriptReady) return;
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

  const handleComplete = async (data: any) => {
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
    if (typeof window === "undefined" || !(window as any).naver?.maps) return;

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
        content: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#111;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.4);border:2px solid white;">
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

    naverNs.maps.Event.addListener(map, "click", (e: any) => {
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
        className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90dvh" }}
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
                  "calc(env(safe-area-inset-bottom, 12px) + 12px)",
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
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">수유실 제보하기</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400"
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="수유실 이름" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: ○○백화점 본점 수유실"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
            />
          </Field>

          <Field label="종류">
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    form.type === t
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="주소 검색" required>
            <button
              type="button"
              onClick={openPostcode}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-left flex items-center gap-2 hover:border-gray-900"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span className={form.roadAddress ? "text-gray-900" : "text-gray-400"}>
                {form.roadAddress || "클릭하여 주소 검색"}
              </span>
            </button>
            {resolving && (
              <p className="mt-1.5 text-xs text-gray-400">좌표를 확인하는 중...</p>
            )}
            {searchError && (
              <p className="mt-1.5 text-xs text-red-500">{searchError}</p>
            )}
            {form.lat != null && form.lng != null && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-2 w-full px-3 py-2.5 rounded-xl border border-gray-900 bg-gray-100 text-gray-900 text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                지도에서 정확한 위치 찾기
              </button>
            )}
          </Field>

          <Field label="상세 위치">
            <input
              type="text"
              value={form.detailLocation}
              onChange={(e) => setForm({ ...form, detailLocation: e.target.value })}
              placeholder="예: 103동 1층 로비 / 본관 3층 화장실 옆"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              동·호수, 층, 건물 내 위치를 적어주세요. 지도의 좌표는 건물 기준으로 표시돼요.
            </p>
          </Field>

          <Field label="연락처">
            <input
              type="tel"
              value={form.tel}
              onChange={(e) => setForm({ ...form, tel: e.target.value })}
              placeholder="02-1234-5678"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
            />
          </Field>

          <Field label="아빠 이용 가능">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dadAvailable}
                onChange={(e) => setForm({ ...form, dadAvailable: e.target.checked })}
                className="w-5 h-5 rounded accent-gray-900"
              />
              <span className="text-sm text-gray-700">아빠도 함께 이용할 수 있어요</span>
            </label>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      on
                        ? "bg-gray-100 text-gray-900 border-gray-400"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {on ? "✓ " : ""}
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
              placeholder="예: 평일 10:00 ~ 20:00"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
            />
          </Field>

          <Field label="추가 설명">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="청결도, 분위기, 주의사항 등을 자유롭게 적어주세요"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 resize-none"
            />
          </Field>

        </div>

        {/* 푸터 */}
        <div
          className="px-5 pt-3 border-t border-gray-100"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 12px) + 12px)" }}
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm disabled:bg-gray-200 disabled:text-gray-400"
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
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-gray-900 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
