"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportSheet, { NursingRoomReport } from "./ReportSheet";

interface NursingRoom {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tel?: string;
  type?: string;
  detailLocation?: string;
  dadAvailable?: boolean;
  facilities?: string[];
  openHours?: string;
  notes?: string;
  reporterName?: string;
}

// 샘플 수유실 데이터 (추후 공공데이터 API 연동)
const SAMPLE_NURSING_ROOMS: NursingRoom[] = [
  { name: "서울역 수유실", address: "서울특별시 용산구 한강대로 405", lat: 37.5547, lng: 126.9707, tel: "02-1234-5678" },
  { name: "시청역 수유실", address: "서울특별시 중구 세종대로 110", lat: 37.5666, lng: 126.9784, tel: "02-2345-6789" },
  { name: "강남역 수유실", address: "서울특별시 강남구 강남대로 396", lat: 37.4979, lng: 127.0276, tel: "02-3456-7890" },
  { name: "잠실역 수유실", address: "서울특별시 송파구 올림픽로 지하 265", lat: 37.5133, lng: 127.1001 },
  { name: "홍대입구역 수유실", address: "서울특별시 마포구 양화로 160", lat: 37.5571, lng: 126.9236 },
];

declare const naver: any;
declare global {
  interface Window {
    naver: any;
  }
}

function NursingRoomContent() {
  const searchParams = useSearchParams();
  const initialRoomName = searchParams.get("room");
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<NursingRoom | null>(
    initialRoomName
      ? SAMPLE_NURSING_ROOMS.find((r) => r.name === initialRoomName) ?? null
      : null
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rooms, setRooms] = useState<NursingRoom[]>(SAMPLE_NURSING_ROOMS);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const handleReportSubmit = async (report: NursingRoomReport) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/nursing-rooms/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "제보 전송 실패");
      }
      setShowReport(false);
      loadRooms();
      setToast("제보해주셔서 감사해요! 검토 후 반영됩니다.");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      console.error(e);
      setToast("제보 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSubmitting(false);
    }
  };

  // 승인된 수유실 목록 로드 (DB + 샘플 병합)
  const loadRooms = async () => {
    try {
      const res = await fetch("/api/nursing-rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: NursingRoom[] = (data.rooms ?? [])
        .filter((r: any) => typeof r.lat === "number" && typeof r.lng === "number")
        .map((r: any) => ({
          name: r.name,
          address: [r.roadAddress, r.detailLocation].filter(Boolean).join(" "),
          lat: r.lat,
          lng: r.lng,
          tel: r.tel ?? undefined,
          type: r.type ?? undefined,
          detailLocation: r.detailLocation ?? undefined,
          dadAvailable: !!r.dadAvailable,
          facilities: Array.isArray(r.facilities) ? r.facilities : [],
          openHours: r.openHours ?? undefined,
          notes: r.notes ?? undefined,
          reporterName: r.reporterName ?? undefined,
        }));
      // 이름 기준 중복 제거(샘플 우선 제거)
      const merged = [
        ...list,
        ...SAMPLE_NURSING_ROOMS.filter((s) => !list.some((r) => r.name === s.name)),
      ];
      setRooms(merged);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is not set");
      return;
    }

    if (window.naver?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // 위치 권한 거부 시 서울시청 기본 좌표
          setUserLocation({ lat: 37.5666, lng: 126.9784 });
        }
      );
    }
  }, []);

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !userLocation) return;

    const center = selectedRoom
      ? new naver.maps.LatLng(selectedRoom.lat, selectedRoom.lng)
      : new naver.maps.LatLng(userLocation.lat, userLocation.lng);
    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
    });

    // 컨테이너 크기가 0인 상태로 init된 경우 타일이 안 뜨는 이슈 방지
    const triggerResize = () => {
      if (!mapRef.current) return;
      window.naver.maps.Event.trigger(map, "resize");
      map.setCenter(center);
    };
    requestAnimationFrame(triggerResize);
    setTimeout(triggerResize, 200);

    // 현재 위치 마커
    new naver.maps.Marker({
      position: new naver.maps.LatLng(userLocation.lat, userLocation.lng),
      map,
      icon: {
        content: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        anchor: new naver.maps.Point(8, 8),
      },
    });

    // 수유실 마커
    rooms.forEach((room) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(room.lat, room.lng),
        map,
        icon: {
          content: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">🍼</div>`,
          anchor: new naver.maps.Point(16, 16),
        },
      });

      naver.maps.Event.addListener(marker, "click", () => {
        setSelectedRoom(room);
        map.panTo(new naver.maps.LatLng(room.lat, room.lng));
      });
    });
  }, [mapLoaded, userLocation, rooms]);

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">지도 로딩중...</span>
            </div>
          </div>
        )}

        {/* 선택된 수유실 정보 카드 */}
        {selectedRoom && (
          <>
          <div
            className="absolute inset-0 z-[5]"
            onClick={() => setSelectedRoom(null)}
            aria-hidden
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-4 right-4 bg-white rounded-2xl shadow-lg z-10 flex flex-col overflow-hidden"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 16px) + 88px)",
              maxHeight: "60dvh",
            }}
          >
            <button
              onClick={() => setSelectedRoom(null)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 z-10"
              aria-label="닫기"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="overflow-y-auto px-4 pt-4 pb-3">
              {/* 헤더: 종류 뱃지 + 이름 */}
              <div className="flex items-center gap-1.5 flex-wrap pr-8">
                {selectedRoom.type && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-semibold">
                    {selectedRoom.type}
                  </span>
                )}
                {selectedRoom.dadAvailable && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold">
                    아빠 가능
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-base mt-1.5">
                {selectedRoom.name}
              </h3>

              {/* 주소 */}
              <div className="flex items-start gap-1.5 mt-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedRoom.address}
                </p>
              </div>

              {/* 이용 시간 */}
              {selectedRoom.openHours && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-sm text-gray-600">{selectedRoom.openHours}</p>
                </div>
              )}

              {/* 편의시설 */}
              {selectedRoom.facilities && selectedRoom.facilities.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-[11px] font-semibold text-gray-400 mb-1">편의시설</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRoom.facilities.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 설명 */}
              {selectedRoom.notes && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-gray-50 text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedRoom.notes}
                </div>
              )}

              {/* 제보자 */}
              {selectedRoom.reporterName && (
                <p className="text-[11px] text-gray-400 mt-2">
                  제보: {selectedRoom.reporterName}
                </p>
              )}
            </div>

          </div>
          </>
        )}
        {/* 수유실 제보 FAB */}
        {!selectedRoom && (
        <button
          onClick={() => setShowReport(true)}
          className="absolute right-4 flex items-center gap-1.5 bg-pink-500 text-white text-sm font-semibold pl-3.5 pr-4 py-3 rounded-full shadow-lg active:scale-95 transition-transform z-10"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 82px)" }}
          aria-label="수유실 제보하기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          수유실 제보
        </button>
        )}

        {toast && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-20"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 170px)" }}
          >
            {toast}
          </div>
        )}
      </div>

      {showReport && (
        <ReportSheet onClose={() => setShowReport(false)} onSubmit={handleReportSubmit} />
      )}
    </div>
  );
}

export default function NursingRoomPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-gray-50" />}>
      <NursingRoomContent />
    </Suspense>
  );
}
