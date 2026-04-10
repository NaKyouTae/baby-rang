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

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

declare const naver: any;
declare global {
  interface Window {
    naver: any;
  }
}

function NursingRoomContent() {
  const searchParams = useSearchParams();
  const initialRoomName = searchParams.get("room");
  const initialLat = searchParams.get("lat");
  const initialLng = searchParams.get("lng");
  const initialAddr = searchParams.get("addr");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<NursingRoom | null>(
    initialRoomName
      ? SAMPLE_NURSING_ROOMS.find((r) => r.name === initialRoomName) ?? null
      : null
  );
  const initialRoomResolved = useRef(false);
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

  // 승인된 수유실 목록 로드 (제보 DB + sooyusil 오픈 API + 샘플 병합)
  const loadRooms = async () => {
    try {
      const [reportedRes, publicRes] = await Promise.all([
        fetch("/api/nursing-rooms", { cache: "no-store" }).catch(() => null),
        fetch("/api/nursing-rooms/public", { cache: "no-store" }).catch(() => null),
      ]);

      let reported: NursingRoom[] = [];
      if (reportedRes && reportedRes.ok) {
        const data = await reportedRes.json();
        reported = (data.rooms ?? [])
          .filter((r: any) => typeof r.lat === "number" && typeof r.lng === "number")
          .map((r: any) => ({
            name: r.name,
            address: r.address ?? [r.roadAddress, r.detailLocation].filter(Boolean).join(" "),
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
      }

      let publicList: NursingRoom[] = [];
      if (publicRes && publicRes.ok) {
        const data = await publicRes.json();
        publicList = (data.rooms ?? []).map((r: any) => ({
          name: r.name,
          address: [r.address, r.detailLocation].filter(Boolean).join(" "),
          lat: r.lat,
          lng: r.lng,
          tel: r.tel ?? undefined,
          type: r.type ?? undefined,
          detailLocation: r.detailLocation ?? undefined,
          dadAvailable: !!r.dadAvailable,
        }));
      }

      // 이름 기준 중복 제거: 제보 DB > 오픈 API > 샘플
      const seen = new Set<string>();
      const merged: NursingRoom[] = [];
      for (const list of [reported, publicList, SAMPLE_NURSING_ROOMS]) {
        for (const r of list) {
          if (seen.has(r.name)) continue;
          seen.add(r.name);
          merged.push(r);
        }
      }
      setRooms(merged);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // 홈에서 넘어온 경우: rooms 로드 후 해당 수유실 선택 + 포커스
  useEffect(() => {
    if (initialRoomResolved.current || !initialRoomName || rooms.length === 0) return;
    const found = rooms.find((r) => r.name === initialRoomName);
    if (found) {
      initialRoomResolved.current = true;
      setSelectedRoom(found);
      const map = mapInstanceRef.current;
      if (map) {
        map.setZoom(16, false);
        map.panTo(new naver.maps.LatLng(found.lat, found.lng));
      }
    } else if (initialLat && initialLng) {
      // rooms에서 못 찾았지만 좌표가 있으면 임시 선택
      initialRoomResolved.current = true;
      const tempRoom: NursingRoom = {
        name: initialRoomName,
        address: initialAddr ?? "",
        lat: parseFloat(initialLat),
        lng: parseFloat(initialLng),
      };
      setSelectedRoom(tempRoom);
      const map = mapInstanceRef.current;
      if (map) {
        map.setZoom(16, false);
        map.panTo(new naver.maps.LatLng(tempRoom.lat, tempRoom.lng));
      }
    }
  }, [rooms, initialRoomName, initialLat, initialLng]);

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
  const fetchUserLocation = (opts?: { panTo?: boolean; showToast?: boolean }) => {
    if (!navigator.geolocation) {
      if (opts?.showToast) {
        setToast("이 기기는 위치 조회를 지원하지 않아요.");
        setTimeout(() => setToast(null), 2500);
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (opts?.panTo && mapInstanceRef.current) {
          mapInstanceRef.current.panTo(
            new naver.maps.LatLng(loc.lat, loc.lng),
            { duration: 600, easing: "easeOutCubic" }
          );
        }
        if (opts?.showToast) {
          setToast("내 위치를 갱신했어요.");
          setTimeout(() => setToast(null), 2000);
        }
      },
      () => {
        if (opts?.showToast) {
          setToast("위치 권한을 허용해주세요.");
          setTimeout(() => setToast(null), 2500);
          return;
        }
        // 최초 로드 시 권한 거부: 서울시청 기본 좌표
        setUserLocation({ lat: 37.5666, lng: 126.9784 });
      }
    );
  };

  useEffect(() => {
    fetchUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !userLocation) return;

    const initialCenter = initialLat && initialLng
      ? new naver.maps.LatLng(parseFloat(initialLat), parseFloat(initialLng))
      : null;
    const center = initialCenter
      ?? (selectedRoom
        ? new naver.maps.LatLng(selectedRoom.lat, selectedRoom.lng)
        : new naver.maps.LatLng(userLocation.lat, userLocation.lng));
    const initialZoom = initialCenter ? 16 : 14;
    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: initialZoom,
      zoomControl: false,
    });
    mapInstanceRef.current = map;

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

    // 줌 레벨에 따른 수유실 마커 클러스터링
    // 낮은 줌: 격자 단위로 묶어 개수 배지, 높은 줌: 개별 👶 마커
    let activeMarkers: any[] = [];
    // 스케일바 500m 이하(줌 ≥ 15)면 개별, 1km 이상(줌 ≤ 14)부터 1000m 격자 병합
    const CLUSTER_ZOOM_THRESHOLD = 15;
    const GRID_SIZE_DEG = 1000 / 111000;

    const clearMarkers = () => {
      activeMarkers.forEach((m) => m.setMap(null));
      activeMarkers = [];
    };

    const renderMarkers = () => {
      clearMarkers();

      // 현재 화면 범위 내 수유실만 대상으로 (약간의 여유 포함)
      const bounds = map.getBounds();
      const sw = bounds.getSW();
      const ne = bounds.getNE();
      const latPad = (ne.lat() - sw.lat()) * 0.2;
      const lngPad = (ne.lng() - sw.lng()) * 0.2;
      const minLat = sw.lat() - latPad;
      const maxLat = ne.lat() + latPad;
      const minLng = sw.lng() - lngPad;
      const maxLng = ne.lng() + lngPad;
      const visible = rooms.filter(
        (r) => r.lat >= minLat && r.lat <= maxLat && r.lng >= minLng && r.lng <= maxLng
      );

      // 줌 ≥ 15 (스케일 500m 이하): 개별 마커
      if (map.getZoom() >= CLUSTER_ZOOM_THRESHOLD) {
        visible.forEach((room) => {
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(room.lat, room.lng),
            map,
            icon: {
              content: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">👶</div>`,
              anchor: new naver.maps.Point(16, 16),
            },
            zIndex: 50,
          });
          naver.maps.Event.addListener(marker, "click", () => {
            setSelectedRoom(room);
            map.panTo(new naver.maps.LatLng(room.lat, room.lng));
          });
          activeMarkers.push(marker);
        });
        return;
      }

      // 줌 ≤ 14: 1000m 격자 단위로 병합
      const gridSize = GRID_SIZE_DEG;
      const cells = new Map<string, { lat: number; lng: number; rooms: NursingRoom[] }>();
      visible.forEach((room) => {
        const gx = Math.floor(room.lng / gridSize);
        const gy = Math.floor(room.lat / gridSize);
        const key = `${gx}:${gy}`;
        const existing = cells.get(key);
        if (existing) {
          existing.lat += room.lat;
          existing.lng += room.lng;
          existing.rooms.push(room);
        } else {
          cells.set(key, { lat: room.lat, lng: room.lng, rooms: [room] });
        }
      });

      cells.forEach((cell) => {
        const count = cell.rooms.length;
        const centerLat = cell.lat / count;
        const centerLng = cell.lng / count;

        if (count === 1) {
          const room = cell.rooms[0];
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(room.lat, room.lng),
            map,
            icon: {
              content: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">👶</div>`,
              anchor: new naver.maps.Point(13, 13),
            },
            zIndex: 50,
          });
          naver.maps.Event.addListener(marker, "click", () => {
            setSelectedRoom(room);
            map.panTo(new naver.maps.LatLng(room.lat, room.lng));
          });
          activeMarkers.push(marker);
          return;
        }

        // 개수에 따라 크기 스케일
        const size = count >= 100 ? 56 : count >= 30 ? 48 : count >= 10 ? 42 : 36;
        const fontSize = count >= 100 ? 14 : count >= 10 ? 13 : 12;
        const cluster = new naver.maps.Marker({
          position: new naver.maps.LatLng(centerLat, centerLng),
          map,
          icon: {
            content: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:rgba(255,199,44,0.92);color:#fff;font-weight:700;font-size:${fontSize}px;border:3px solid rgba(255,255,255,0.95);border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">${count}</div>`,
            anchor: new naver.maps.Point(size / 2, size / 2),
          },
          zIndex: 40,
        });
        naver.maps.Event.addListener(cluster, "click", () => {
          map.morph(
            new naver.maps.LatLng(centerLat, centerLng),
            Math.min(map.getZoom() + 2, 16)
          );
        });
        activeMarkers.push(cluster);
      });
    };

    // 줌/이동이 끝난 뒤 1회만 재렌더 (zoom_changed는 애니메이션 중 연속 발사되어 성능 저하)
    renderMarkers();
    const idleListener = naver.maps.Event.addListener(map, "idle", renderMarkers);
    // 빈 지도 클릭 시 선택 해제 (마커 클릭은 이 이벤트를 발생시키지 않음)
    const mapClickListener = naver.maps.Event.addListener(map, "click", () => {
      setSelectedRoom(null);
    });

    return () => {
      naver.maps.Event.removeListener(idleListener);
      naver.maps.Event.removeListener(mapClickListener);
      clearMarkers();
    };
  }, [mapLoaded, userLocation, rooms]);

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* 상단 검색바 */}
        <div
          className="absolute left-3 right-3 z-20"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          <div className="relative">
            <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="수유실 이름 또는 지역 검색"
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500"
                  aria-label="지우기"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {searchFocused && searchQuery.trim().length > 0 && (() => {
              const q = searchQuery.trim().toLowerCase();
              const results = rooms
                .filter((r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q))
                .slice(0, 30);
              return (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg overflow-hidden max-h-[60dvh] overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      검색 결과가 없어요
                    </div>
                  ) : (
                    results.map((room) => (
                      <button
                        key={`${room.name}-${room.lat}-${room.lng}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedRoom(room);
                          setSearchQuery("");
                          setSearchFocused(false);
                          const map = mapInstanceRef.current;
                          if (map) {
                            map.setZoom(16, false);
                            map.panTo(new naver.maps.LatLng(room.lat, room.lng));
                          }
                        }}
                        className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {room.type && (
                            <span className="inline-block px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[9px] font-semibold">
                              {room.type}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {room.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {room.address}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        </div>


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

              {/* 전화번호 + 거리 */}
              {(selectedRoom.tel || userLocation) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {selectedRoom.tel && (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <a href={`tel:${selectedRoom.tel}`} className="text-sm text-gray-600 underline decoration-gray-300 underline-offset-2">
                        {selectedRoom.tel}
                      </a>
                    </>
                  )}
                  {userLocation && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {formatDistance(distanceKm(userLocation, { lat: selectedRoom.lat, lng: selectedRoom.lng }))}
                    </span>
                  )}
                </div>
              )}

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
        {/* 내 위치 갱신 FAB */}
        {!selectedRoom && (
        <button
          onClick={() => fetchUserLocation({ panTo: true, showToast: true })}
          className="absolute right-4 flex items-center justify-center bg-white text-gray-900 w-11 h-11 rounded-full shadow-lg active:scale-95 transition-transform z-10"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 82px)" }}
          aria-label="내 위치 갱신"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
        )}

        {/* 수유실 제보 FAB */}
        {!selectedRoom && (
        <button
          onClick={() => setShowReport(true)}
          className="absolute left-4 flex items-center gap-1.5 bg-primary-500 text-white text-sm font-semibold pl-3.5 pr-4 py-3 rounded-full shadow-lg active:scale-95 transition-transform z-10"
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
