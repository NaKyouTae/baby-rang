"use client";

import { Suspense, useEffect, useRef, useState } from "react";

interface Library {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tel?: string;
  openHours?: string;
}

// 임시 도서관 데이터 (추후 API 연동)
const SAMPLE_LIBRARIES: Library[] = [
  { name: "서울도서관", address: "서울특별시 중구 세종대로 110", lat: 37.5664, lng: 126.9779, tel: "02-2133-0300", openHours: "화~금 09:00~21:00, 토~일 09:00~18:00" },
  { name: "국립어린이청소년도서관", address: "서울특별시 강남구 테헤란로7길 21", lat: 37.5069, lng: 127.0234, tel: "02-3413-4800", openHours: "화~일 09:00~18:00" },
  { name: "마포구립서강도서관", address: "서울특별시 마포구 독막로 296", lat: 37.5503, lng: 126.9267, tel: "02-3141-7053", openHours: "화~금 09:00~22:00, 토~일 09:00~17:00" },
  { name: "송파어린이도서관", address: "서울특별시 송파구 송이로 37길 13", lat: 37.5048, lng: 127.1120, tel: "02-2147-2840", openHours: "화~일 09:00~18:00" },
  { name: "용산구립이태원꿈나무도서관", address: "서울특별시 용산구 보광로 116", lat: 37.5340, lng: 126.9920, tel: "02-3785-0531", openHours: "화~금 09:00~18:00, 토~일 09:00~17:00" },
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

function LibraryContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const libraries = SAMPLE_LIBRARIES;

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

    const center = new naver.maps.LatLng(userLocation.lat, userLocation.lng);
    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: 13,
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

    // 도서관 마커
    libraries.forEach((lib) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lib.lat, lib.lng),
        map,
        icon: {
          content: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📚</div>`,
          anchor: new naver.maps.Point(16, 16),
        },
        zIndex: 50,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        setSelectedLibrary(lib);
        map.panTo(new naver.maps.LatLng(lib.lat, lib.lng));
      });
    });

    // 빈 지도 클릭 시 선택 해제
    naver.maps.Event.addListener(map, "click", () => {
      setSelectedLibrary(null);
    });
  }, [mapLoaded, userLocation]);

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* 지도 영역 */}
      <div className="flex-1 relative isolate">
        <div ref={mapRef} className="w-full h-full" />

        {/* 상단 검색바 */}
        <div
          className="absolute left-3 right-3 z-20"
          style={{ top: "calc(var(--safe-area-top) + 12px)" }}
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
                placeholder="도서관 이름 또는 지역 검색"
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
              const results = libraries
                .filter((r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q))
                .slice(0, 30);
              return (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg overflow-hidden max-h-[60dvh] overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      검색 결과가 없어요
                    </div>
                  ) : (
                    results.map((lib) => (
                      <button
                        key={`${lib.name}-${lib.lat}-${lib.lng}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedLibrary(lib);
                          setSearchQuery("");
                          setSearchFocused(false);
                          const map = mapInstanceRef.current;
                          if (map) {
                            map.setZoom(16, false);
                            map.panTo(new naver.maps.LatLng(lib.lat, lib.lng));
                          }
                        }}
                        className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50"
                      >
                        <span className="text-sm font-semibold text-gray-900 truncate block">
                          {lib.name}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5 truncate block">
                          {lib.address}
                        </span>
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
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">지도 로딩중...</span>
            </div>
          </div>
        )}

        {/* 선택된 도서관 정보 카드 */}
        {selectedLibrary && (
          <div
            className="absolute left-4 right-4 bg-white rounded-2xl shadow-lg z-10 flex flex-col overflow-hidden"
            style={{
              bottom: "calc(max(env(safe-area-inset-bottom, 0px), 16px) + 80px)",
              maxHeight: "60dvh",
            }}
          >
            <button
              onClick={() => setSelectedLibrary(null)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 z-10"
              aria-label="닫기"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="overflow-y-auto px-4 pt-4 pb-3">
              <h3 className="font-bold text-gray-900 text-base pr-8">
                {selectedLibrary.name}
              </h3>

              {/* 주소 */}
              <div className="flex items-start gap-1.5 mt-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedLibrary.address}
                </p>
              </div>

              {/* 전화번호 + 거리 */}
              {(selectedLibrary.tel || userLocation) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {selectedLibrary.tel && (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <a href={`tel:${selectedLibrary.tel}`} className="text-sm text-gray-600 underline decoration-gray-300 underline-offset-2">
                        {selectedLibrary.tel}
                      </a>
                    </>
                  )}
                  {userLocation && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {formatDistance(distanceKm(userLocation, { lat: selectedLibrary.lat, lng: selectedLibrary.lng }))}
                    </span>
                  )}
                </div>
              )}

              {/* 운영시간 */}
              {selectedLibrary.openHours && (
                <div className="flex items-start gap-1.5 mt-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <p className="text-sm text-gray-600">{selectedLibrary.openHours}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 내 위치 갱신 FAB */}
        {!selectedLibrary && (
          <button
            onClick={() => fetchUserLocation({ panTo: true, showToast: true })}
            className="absolute right-4 flex items-center justify-center bg-white text-gray-900 w-11 h-11 rounded-full shadow-lg active:scale-95 transition-transform z-10"
            style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 16px) + 80px)" }}
            aria-label="내 위치 갱신"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        )}

        {toast && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-20"
            style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 16px) + 136px)" }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-gray-50" />}>
      <LibraryContent />
    </Suspense>
  );
}
