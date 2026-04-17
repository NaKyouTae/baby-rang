"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportSheet, { NursingRoomReport } from "./ReportSheet";
import { palette } from "@/lib/colors";

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

function getTypeBadgeColor(type?: string) {
  if (!type) return "#515C66";
  if (type.includes("가족")) return "#FF3B30";
  if (type.includes("기저귀")) return "#22C55E";
  if (type.includes("수유")) return "#FFBB26";
  return "#515C66";
}

function TypeBadge({ type }: { type: string }) {
  const color = getTypeBadgeColor(type);
  return (
    <span
      className="inline-flex items-center h-4 px-1 py-0.5 rounded-[2px] text-xs font-medium leading-none"
      style={{ backgroundColor: `${color}26`, color }}
    >
      {type}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps SDK global
declare const naver: any;
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps SDK global
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps instance
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
          .filter((r: Record<string, unknown>) => typeof r.lat === "number" && typeof r.lng === "number")
          .map((r: Record<string, unknown>) => ({
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
        publicList = (data.rooms ?? []).map((r: Record<string, unknown>) => ({
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
    // 낮은 줌: 격자 단위로 묶어 개수 배지, 높은 줌: 개별 📌 마커
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- naver maps marker instances
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
              content: `<svg width="28" height="28" viewBox="0 0 19 23" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));"><path d="M10.1419 21.9989C11.3566 20.7149 13.5563 18.4066 15.5051 16.4478C19.2197 12.7142 19.4732 6.34324 15.7132 2.65511C13.907 0.884195 11.5571 -0.00125999 9.20724 1.34566e-06C6.85738 1.34566e-06 4.50752 0.884195 2.70255 2.65511C-1.05874 6.34324 -0.805214 12.7155 2.91067 16.449C4.85943 18.4079 7.06172 20.7161 8.2789 21.9989C8.78596 22.5337 9.6361 22.5337 10.1419 21.9989Z" fill="#F03D30"/><path d="M9.20854 12.0508C10.732 12.0508 11.9671 10.8157 11.9671 9.29223C11.9671 7.76873 10.732 6.53369 9.20854 6.53369C7.68505 6.53369 6.45001 7.76873 6.45001 9.29223C6.45001 10.8157 7.68505 12.0508 9.20854 12.0508Z" fill="#FDFDFE"/></svg>`,
              anchor: new naver.maps.Point(14, 28),
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
              content: `<svg width="28" height="28" viewBox="0 0 19 23" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));"><path d="M10.1419 21.9989C11.3566 20.7149 13.5563 18.4066 15.5051 16.4478C19.2197 12.7142 19.4732 6.34324 15.7132 2.65511C13.907 0.884195 11.5571 -0.00125999 9.20724 1.34566e-06C6.85738 1.34566e-06 4.50752 0.884195 2.70255 2.65511C-1.05874 6.34324 -0.805214 12.7155 2.91067 16.449C4.85943 18.4079 7.06172 20.7161 8.2789 21.9989C8.78596 22.5337 9.6361 22.5337 10.1419 21.9989Z" fill="#F03D30"/><path d="M9.20854 12.0508C10.732 12.0508 11.9671 10.8157 11.9671 9.29223C11.9671 7.76873 10.732 6.53369 9.20854 6.53369C7.68505 6.53369 6.45001 7.76873 6.45001 9.29223C6.45001 10.8157 7.68505 12.0508 9.20854 12.0508Z" fill="#FDFDFE"/></svg>`,
              anchor: new naver.maps.Point(14, 28),
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

        const size = 28;
        const cluster = new naver.maps.Marker({
          position: new naver.maps.LatLng(centerLat, centerLng),
          map,
          icon: {
            content: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:rgba(48,176,199,0.72);color:#fff;font-weight:700;font-size:12px;border:1px solid #30B0C7;border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">${count}</div>`,
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
      <div className="flex-1 relative isolate">
        <div ref={mapRef} className="w-full h-full" />

        {/* 상단 검색바 */}
        <div
          className="absolute left-6 right-6 z-20"
          style={{ top: "calc(var(--safe-area-top) + 24px)" }}
        >
          <div className="relative">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 h-10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M3.33333 8.45246C3.33333 4.70496 6.31833 1.66663 9.99999 1.66663C13.6817 1.66663 16.6667 4.70496 16.6667 8.45246C16.6667 12.1708 14.5392 16.5108 11.2192 18.0616C10.8376 18.2403 10.4214 18.3329 9.99999 18.3329C9.57864 18.3329 9.16243 18.2403 8.78083 18.0616C5.46083 16.51 3.33333 12.1716 3.33333 8.45329V8.45246Z" stroke="#121212" strokeWidth="1.25"/>
                <path d="M3.33333 8.45246C3.33333 4.70496 6.31833 1.66663 9.99999 1.66663C13.6817 1.66663 16.6667 4.70496 16.6667 8.45246C16.6667 12.1708 14.5392 16.5108 11.2192 18.0616C10.8376 18.2403 10.4214 18.3329 9.99999 18.3329C9.57864 18.3329 9.16243 18.2403 8.78083 18.0616C5.46083 16.51 3.33333 12.1716 3.33333 8.45329V8.45246Z" stroke="black" strokeOpacity="0.2" strokeWidth="1.25"/>
                <path d="M10 10.8333C11.3807 10.8333 12.5 9.71396 12.5 8.33325C12.5 6.95254 11.3807 5.83325 10 5.83325C8.61929 5.83325 7.5 6.95254 7.5 8.33325C7.5 9.71396 8.61929 10.8333 10 10.8333Z" stroke="#121212" strokeWidth="1.25"/>
                <path d="M10 10.8333C11.3807 10.8333 12.5 9.71396 12.5 8.33325C12.5 6.95254 11.3807 5.83325 10 5.83325C8.61929 5.83325 7.5 6.95254 7.5 8.33325C7.5 9.71396 8.61929 10.8333 10 10.8333Z" stroke="black" strokeOpacity="0.2" strokeWidth="1.25"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="검색어를 입력해 주세요. (수유실 이름, 지역 등)"
                className="flex-1 text-sm text-gray-900 placeholder:text-xs placeholder:font-medium placeholder:text-[#BBC0C5] outline-none bg-transparent min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 flex items-center justify-center"
                  aria-label="지우기"
                >
                  <svg width="20" height="20" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6667 8.33333C16.6667 12.9358 12.9358 16.6667 8.33333 16.6667C3.73083 16.6667 0 12.9358 0 8.33333C0 3.73083 3.73083 0 8.33333 0C12.9358 0 16.6667 3.73083 16.6667 8.33333Z" fill="#EEF0F1"/>
                    <path d="M5.83 5.83L10.83 10.83M10.83 5.83L5.83 10.83" stroke="#808991" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {searchFocused && searchQuery.trim().length > 0 && (() => {
              const q = searchQuery.trim().toLowerCase();
              const results = rooms
                .filter(
                  (r) =>
                    r.name.toLowerCase().includes(q) ||
                    r.address.toLowerCase().includes(q) ||
                    (r.type?.toLowerCase().includes(q) ?? false)
                )
                .slice(0, 30);
              return (
                <div
                  className="absolute left-0 right-0"
                  style={{ top: "calc(100% + 10px)" }}
                >
                  {results.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg h-10 flex items-center justify-center text-xs font-medium text-gray-400">
                      검색 결과가 없어요.
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-lg max-h-[228px] overflow-y-auto p-[10px]">
                      {results.map((room, idx) => (
                        <div key={`${room.name}-${room.lat}-${room.lng}`} className="contents">
                          {idx > 0 && (
                            <hr className="border-0 border-t border-gray-200 my-[10px]" />
                          )}
                          <button
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
                            className="block w-full text-left active:opacity-70"
                          >
                            <div className="flex items-center gap-1.5 h-4">
                              {room.type && <TypeBadge type={room.type} />}
                              <span className="flex items-center text-xs font-medium text-app-black truncate leading-none">
                                {room.name}
                              </span>
                            </div>
                            <div className="text-[10px] font-normal text-gray-500 mt-2 truncate">
                              {room.address}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
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
            className="absolute left-6 right-6 bg-white rounded-lg shadow-lg z-10 flex flex-col overflow-hidden"
            style={{
              bottom: "calc(var(--bottom-nav-gap) + 56px + 10px)",
              maxHeight: "60dvh",
            }}
          >
            <div className="overflow-y-auto p-[10px]">
              {/* 헤더: 종류 뱃지 + 닫기 */}
              <div className="flex items-center gap-1.5 h-4">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  {selectedRoom.type && <TypeBadge type={selectedRoom.type} />}
                  {selectedRoom.dadAvailable && (
                    <span className="inline-flex items-center h-4 px-1 py-0.5 rounded-[2px] text-xs font-medium leading-none bg-blue-50 text-blue-600">
                      아빠 가능
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="shrink-0 flex items-center justify-center w-4 h-4"
                  aria-label="닫기"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.75 0.75L0.75 8.75M0.75 0.75C3.87419 3.87419 8.75 8.75 8.75 8.75" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <h3 className="font-medium text-base text-app-black truncate">
                  {selectedRoom.name}
                </h3>
                {userLocation && (
                  <span className="text-xs font-normal text-gray-500 whitespace-nowrap shrink-0">
                    {formatDistance(distanceKm(userLocation, { lat: selectedRoom.lat, lng: selectedRoom.lng }))}
                  </span>
                )}
              </div>

              {/* 주소 */}
              <div className="flex items-start gap-1.5 mt-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-0.5 shrink-0">
                  <path d="M13.5 4.77472C13.5 4.4159 13.4994 4.18816 13.4798 4.01625C13.4617 3.85728 13.4317 3.79799 13.4056 3.7617C13.3795 3.72544 13.3326 3.67815 13.1875 3.61065C13.1093 3.57426 13.0163 3.53812 12.9004 3.49672L12.4746 3.35154L11.6979 3.09308C11.1069 2.89594 10.7562 2.78385 10.5 2.73696V11.054C10.8773 11.0947 11.2756 11.231 11.8125 11.4101C12.2901 11.5693 12.6069 11.6747 12.849 11.7252C13.0857 11.7747 13.1669 11.7518 13.2031 11.7357C13.266 11.7077 13.3227 11.6673 13.3691 11.6165L13.3919 11.5853C13.4178 11.542 13.4497 11.4573 13.4707 11.2767C13.4993 11.031 13.5 10.6972 13.5 10.194V4.77472ZM9.5 2.95636C9.29278 3.07618 9.02601 3.24935 8.64909 3.50063L7.72787 4.11586V4.11651C7.23184 4.44667 6.87194 4.68977 6.5 4.82485V13.0429C6.70716 12.9231 6.9736 12.7498 7.35026 12.4987L8.27214 11.8841V11.8834C8.76826 11.5532 9.12799 11.3095 9.5 11.1745V2.95636ZM2.5 11.2252C2.5 11.5841 2.50058 11.8118 2.52019 11.9837C2.53833 12.1427 2.5683 12.202 2.5944 12.2383C2.62051 12.2745 2.66745 12.3218 2.8125 12.3893C2.9692 12.4622 3.18472 12.5349 3.52539 12.6484L4.30209 12.9069C4.89299 13.104 5.24381 13.2154 5.5 13.2623V4.94529C5.12271 4.90459 4.72439 4.76895 4.1875 4.58982C3.71002 4.43066 3.3932 4.32538 3.15104 4.27472C2.91444 4.22523 2.83271 4.2475 2.79623 4.26365C2.73398 4.29174 2.67815 4.33228 2.63216 4.38279L2.63086 4.38409C2.60391 4.41366 2.55719 4.48387 2.5293 4.72328C2.50071 4.9689 2.5 5.30285 2.5 5.80662V11.2252ZM14.5 10.194C14.5 10.6726 14.5011 11.0754 14.4642 11.3926C14.4267 11.7152 14.3419 12.0337 14.1068 12.291V12.2916C13.9675 12.4438 13.7985 12.5659 13.61 12.6497V12.6491C13.2916 12.7909 12.9625 12.7702 12.6445 12.7038C12.3321 12.6385 11.9502 12.5101 11.4961 12.3587H11.4954C10.7487 12.1096 10.4934 12.0322 10.2448 12.041H10.2435C10.1446 12.0443 10.0462 12.0574 9.94987 12.0801L9.94922 12.0794C9.70724 12.1374 9.47966 12.2805 8.82618 12.7155L7.9056 13.3307C7.14727 13.8363 6.63696 14.1904 6.03646 14.2702C5.43591 14.3512 4.85024 14.1438 3.98568 13.8554V13.8548L3.20964 13.597H3.20899C2.8901 13.4907 2.61099 13.3981 2.39063 13.2956C2.15857 13.1876 1.94575 13.0485 1.78321 12.8229C1.62069 12.5972 1.5557 12.3512 1.5267 12.097C1.49914 11.8554 1.5 11.5611 1.5 11.2252V5.80662C1.5 5.32787 1.49893 4.92506 1.53581 4.60805C1.57334 4.28569 1.65799 3.96734 1.89258 3.71026C2.03162 3.55742 2.20073 3.43466 2.38933 3.35024L2.39063 3.34959C2.70886 3.20843 3.03772 3.22975 3.35547 3.2962C3.66791 3.36154 4.05033 3.48984 4.50456 3.64125C5.25131 3.8904 5.50663 3.96771 5.75521 3.95896H5.75651C5.85544 3.95569 5.95378 3.94254 6.05013 3.9199C6.29227 3.86194 6.51939 3.71899 7.17318 3.28383L8.0944 2.66925C8.85247 2.16387 9.36268 1.8097 9.96289 1.72979C10.5636 1.64859 11.1496 1.85604 12.0143 2.14451H12.0137L12.7904 2.40297H12.791C13.1099 2.50927 13.389 2.60189 13.6094 2.7044C13.8414 2.81238 14.0543 2.95142 14.2168 3.17706C14.3793 3.40275 14.4443 3.64877 14.4733 3.90297C14.5009 4.14457 14.5 4.43887 14.5 4.77472V10.194Z" fill="#808991"/>
                </svg>
                <p className="text-xs font-normal text-gray-500 leading-relaxed break-keep">
                  {selectedRoom.address}
                </p>
              </div>

              {/* 전화번호 */}
              {selectedRoom.tel && (
                <div className="flex items-center gap-1.5 mt-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path d="M8.83998 1.25335C8.85051 1.18851 8.87371 1.12638 8.90826 1.07051C8.94281 1.01464 8.98803 0.966132 9.04134 0.927747C9.09464 0.889362 9.15499 0.861857 9.21893 0.846803C9.28287 0.831749 9.34915 0.829442 9.41398 0.840013C9.43131 0.843347 9.48531 0.853347 9.51398 0.860013C9.57131 0.872458 9.64954 0.89268 9.74865 0.92068C9.94665 0.97868 10.2233 1.07401 10.5553 1.22535C11.2193 1.53001 12.1026 2.06268 13.02 2.98001C13.9373 3.89735 14.47 4.78068 14.7746 5.44535C14.9266 5.77668 15.0213 6.05335 15.0793 6.25135C15.1084 6.35144 15.1335 6.45263 15.1546 6.55468L15.158 6.57468C15.1801 6.70681 15.1494 6.84234 15.0724 6.95199C14.9955 7.06164 14.8784 7.13661 14.7466 7.16068C14.6161 7.18188 14.4825 7.15049 14.375 7.0734C14.2676 6.99631 14.1951 6.87979 14.1733 6.74935L14.164 6.70401C14.151 6.64575 14.1361 6.58794 14.1193 6.53068C14.0512 6.30196 13.9665 6.07848 13.866 5.86201C13.606 5.29535 13.1386 4.51201 12.3126 3.68735C11.488 2.86201 10.7053 2.39401 10.138 2.13401C9.92151 2.03351 9.69804 1.94884 9.46931 1.88068C9.39915 1.86097 9.32845 1.84319 9.25731 1.82735C9.12657 1.80538 9.00965 1.73305 8.93163 1.62586C8.85361 1.51867 8.8207 1.38518 8.83998 1.25401" fill="#808991"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.99068 3.55333C9.02712 3.42586 9.1127 3.31809 9.22859 3.25371C9.34448 3.18932 9.4812 3.1736 9.60868 3.21H9.61068L9.61268 3.21133L9.61801 3.21266L9.63134 3.21666C9.64157 3.21977 9.65401 3.22422 9.66868 3.23C9.6989 3.23977 9.73823 3.25511 9.78668 3.276C9.88401 3.31733 10.0167 3.382 10.18 3.478C10.5067 3.67133 10.9513 3.992 11.4747 4.51533C11.998 5.03866 12.3187 5.484 12.512 5.81066C12.6087 5.97333 12.6727 6.106 12.7147 6.204C12.7364 6.25494 12.7559 6.30676 12.7733 6.35933L12.778 6.37266L12.7793 6.37733V6.37933L12.78 6.38066C12.8155 6.50731 12.7997 6.64351 12.736 6.75857C12.6723 6.87364 12.5658 6.95896 12.4396 6.99605C12.3134 7.03315 12.1777 7.01902 12.0618 6.95674C11.946 6.89447 11.8593 6.78905 11.8207 6.66333L11.8187 6.656L11.7953 6.59733C11.7528 6.50215 11.7047 6.40955 11.6513 6.32C11.5027 6.06866 11.2347 5.68933 10.768 5.22266C10.3013 4.756 9.92134 4.48733 9.67068 4.33866C9.56273 4.27529 9.45045 4.2196 9.33468 4.172L9.32734 4.16933C9.20156 4.13146 9.09573 4.04562 9.03273 3.93035C8.96973 3.81508 8.95463 3.67965 8.99068 3.55333ZM3.33801 2.938C4.45801 1.818 6.34868 1.90333 7.12868 3.30066L7.56134 4.076C8.07001 4.98866 7.85334 6.14 7.10801 6.89466C7.0641 6.96123 7.04005 7.03893 7.03868 7.11866C7.03001 7.28933 7.09068 7.68466 7.70334 8.29666C8.31534 8.90866 8.71001 8.97 8.88134 8.96133C8.96124 8.96028 9.03918 8.93646 9.10601 8.89266C9.86001 8.14666 11.012 7.93 11.924 8.43933L12.6993 8.872C14.0967 9.652 14.182 11.542 13.062 12.662C12.4627 13.2607 11.6667 13.7933 10.73 13.8287C9.34334 13.8813 7.03934 13.5233 4.75801 11.242C2.47734 8.96066 2.11868 6.65733 2.17134 5.27C2.20668 4.334 2.73934 3.53666 3.33801 2.938ZM6.25534 3.788C5.85534 3.07266 4.78201 2.908 4.04534 3.64533C3.52868 4.162 3.19201 4.732 3.17068 5.308C3.12668 6.46466 3.41268 8.48133 5.46534 10.5347C7.51801 12.588 9.53534 12.8733 10.692 12.8293C11.2673 12.808 11.8387 12.4713 12.3547 11.9547C13.092 11.2173 12.928 10.1447 12.212 9.74533L11.4367 9.312C10.9547 9.04333 10.2767 9.13533 9.80134 9.61066C9.75468 9.65733 9.45734 9.93466 8.93001 9.96C8.39001 9.98666 7.73601 9.744 6.99668 9.004C6.25601 8.264 6.01334 7.61 6.04001 7.06933C6.06534 6.542 6.34334 6.24466 6.38934 6.19866C6.86534 5.72266 6.95668 5.04533 6.68801 4.56333L6.25534 3.788Z" fill="#808991"/>
                  </svg>
                  <a href={`tel:${selectedRoom.tel}`} className="text-xs font-normal text-gray-500">
                    {selectedRoom.tel}
                  </a>
                </div>
              )}

              {/* 이용 시간 */}
              {selectedRoom.openHours && (
                <div className="flex items-start gap-1.5 mt-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-sm text-gray-600">{selectedRoom.openHours}</p>
                </div>
              )}

              {/* 편의시설 */}
              {selectedRoom.facilities && selectedRoom.facilities.length > 0 && (
                <div className="mt-1">
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
                <div className="mt-1 p-2.5 rounded-xl bg-gray-50 text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {selectedRoom.notes}
                </div>
              )}

              {/* 제보자 */}
              {selectedRoom.reporterName && (
                <p className="text-[11px] text-gray-400 mt-1">
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
          className="absolute right-6 flex items-center justify-center bg-white text-gray-900 w-8 h-8 rounded-full shadow-lg active:scale-95 transition-transform z-10"
          style={{ bottom: "calc(var(--bottom-nav-gap) + 72px)" }}
          aria-label="내 위치 갱신"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.3334 8.00008C13.3334 9.41457 12.7715 10.7711 11.7713 11.7713C10.7711 12.7715 9.41451 13.3334 8.00002 13.3334C6.58553 13.3334 5.22898 12.7715 4.22878 11.7713C3.22859 10.7711 2.66669 9.41457 2.66669 8.00008C2.66669 6.58559 3.22859 5.22904 4.22878 4.22885C5.22898 3.22865 6.58553 2.66675 8.00002 2.66675C9.41451 2.66675 10.7711 3.22865 11.7713 4.22885C12.7715 5.22904 13.3334 6.58559 13.3334 8.00008Z" stroke="currentColor" />
            <path d="M10 8C10 8.53043 9.78929 9.03914 9.41421 9.41421C9.03914 9.78929 8.53043 10 8 10C7.46957 10 6.96086 9.78929 6.58579 9.41421C6.21071 9.03914 6 8.53043 6 8C6 7.46957 6.21071 6.96086 6.58579 6.58579C6.96086 6.21071 7.46957 6 8 6C8.53043 6 9.03914 6.21071 9.41421 6.58579C9.78929 6.96086 10 7.46957 10 8Z" stroke="currentColor" />
            <path d="M1.33334 8.00004H2.66668M13.3333 8.00004H14.6667M8.00001 2.66671V1.33337M8.00001 14.6667V13.3334" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </button>
        )}

        {/* 수유실 제보 FAB */}
        {!selectedRoom && (
        <button
          onClick={() => setShowReport(true)}
          className="absolute left-6 flex items-center gap-1.5 bg-primary-500 text-white text-[12px] font-medium h-8 px-3 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform z-10"
          style={{ bottom: "calc(var(--bottom-nav-gap) + 72px)" }}
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
            style={{ bottom: "calc(max(var(--safe-area-bottom), 16px) + 136px)" }}
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

export default function NursingRoomClient() {
  return (
    <Suspense fallback={<div className="h-dvh bg-gray-50" />}>
      <NursingRoomContent />
    </Suspense>
  );
}
