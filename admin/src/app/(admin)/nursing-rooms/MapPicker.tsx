"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
}

export default function MapPicker({
  open,
  initialLat,
  initialLng,
  initialAddress,
  onClose,
  onConfirm,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const pickedRef = useRef<{ lat: number; lng: number } | null>(null);

  // 스크립트 로드
  useEffect(() => {
    if (!open) return;
    const w = window as any;
    if (w.naver?.maps) {
      setReady(true);
      return;
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      console.error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is not set");
      return;
    }
    const existing = document.getElementById(
      "naver-map-script",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "naver-map-script";
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [open]);

  // 지도 초기화
  useEffect(() => {
    if (!open || !ready || !mapRef.current) return;
    const w = window as any;
    const naverNs = w.naver;

    const lat = initialLat ?? 37.5666;
    const lng = initialLng ?? 126.9784;
    pickedRef.current = { lat, lng };

    const map = new naverNs.maps.Map(mapRef.current, {
      center: new naverNs.maps.LatLng(lat, lng),
      zoom: initialLat != null ? 17 : 14,
      zoomControl: true,
      zoomControlOptions: { position: naverNs.maps.Position.TOP_RIGHT },
    });

    const marker = new naverNs.maps.Marker({
      position: new naverNs.maps.LatLng(lat, lng),
      map,
      draggable: true,
      icon: {
        content: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#ec4899;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(236,72,153,0.5);border:2px solid white;">
          <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
        </div>`,
        anchor: new naverNs.maps.Point(18, 36),
      },
    });

    naverNs.maps.Event.addListener(marker, "dragend", () => {
      const pos = marker.getPosition();
      pickedRef.current = { lat: pos.y, lng: pos.x };
    });

    naverNs.maps.Event.addListener(map, "click", (e: any) => {
      marker.setPosition(e.coord);
      pickedRef.current = { lat: e.coord.y, lng: e.coord.x };
    });

    // 주소가 있으면 지오코딩으로 초기 중심 보정
    if (initialAddress && initialLat == null) {
      if (naverNs.maps.Service?.geocode) {
        naverNs.maps.Service.geocode(
          { query: initialAddress },
          (status: any, response: any) => {
            if (status !== naverNs.maps.Service.Status.OK) return;
            const first = response.v2?.addresses?.[0];
            if (!first) return;
            const la = parseFloat(first.y);
            const ln = parseFloat(first.x);
            if (!isFinite(la) || !isFinite(ln)) return;
            const pt = new naverNs.maps.LatLng(la, ln);
            map.setCenter(pt);
            map.setZoom(17);
            marker.setPosition(pt);
            pickedRef.current = { lat: la, lng: ln };
          },
        );
      }
    }

    // 컨테이너 크기 측정 타이밍 이슈 방지 - 여러 번 resize 트리거
    const triggerResize = () => {
      if (!mapRef.current) return;
      naverNs.maps.Event.trigger(map, "resize");
      if (pickedRef.current) {
        map.setCenter(
          new naverNs.maps.LatLng(
            pickedRef.current.lat,
            pickedRef.current.lng,
          ),
        );
      }
    };
    requestAnimationFrame(triggerResize);
    const t1 = setTimeout(triggerResize, 100);
    const t2 = setTimeout(triggerResize, 300);
    const t3 = setTimeout(triggerResize, 600);

    // ResizeObserver로 컨테이너 크기 변동 감지 시에도 재트리거
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapRef.current) {
      ro = new ResizeObserver(() => triggerResize());
      ro.observe(mapRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro?.disconnect();
      marker.setMap(null);
      map.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ height: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">지도에서 위치 찾기</h3>
            {initialAddress && (
              <p className="text-xs text-gray-500 mt-0.5">{initialAddress}</p>
            )}
          </div>
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
        <div className="px-5 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
          지도를 클릭하거나 마커를 드래그해서 정확한 위치를 지정하세요.
        </div>
        <div className="relative flex-1 min-h-0">
          <div
            ref={mapRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 pointer-events-none">
              <span className="text-sm text-gray-500">지도 로딩중...</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (pickedRef.current) {
                onConfirm(pickedRef.current.lat, pickedRef.current.lng);
              }
            }}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold"
          >
            이 위치로 저장
          </button>
        </div>
      </div>
    </div>
  );
}
