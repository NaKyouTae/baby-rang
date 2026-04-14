"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
    const existing = document.getElementById("naver-map-script") as HTMLScriptElement | null;
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

    const triggerResize = () => {
      if (!mapRef.current) return;
      naverNs.maps.Event.trigger(map, "resize");
      if (pickedRef.current) {
        map.setCenter(
          new naverNs.maps.LatLng(pickedRef.current.lat, pickedRef.current.lng),
        );
      }
    };
    requestAnimationFrame(triggerResize);
    const t1 = setTimeout(triggerResize, 100);
    const t2 = setTimeout(triggerResize, 300);
    const t3 = setTimeout(triggerResize, 600);

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
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg w-full max-w-3xl flex flex-col overflow-hidden shadow-lg border"
        style={{ height: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-semibold">지도에서 위치 찾기</h3>
            {initialAddress && (
              <p className="text-xs text-muted-foreground mt-0.5">{initialAddress}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-2 text-xs text-muted-foreground bg-muted border-b">
          지도를 클릭하거나 마커를 드래그해서 정확한 위치를 지정하세요.
        </div>
        <div className="relative flex-1 min-h-0">
          <div
            ref={mapRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted pointer-events-none">
              <span className="text-sm text-muted-foreground">지도 로딩중...</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-3 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (pickedRef.current) {
                onConfirm(pickedRef.current.lat, pickedRef.current.lng);
              }
            }}
          >
            이 위치로 저장
          </Button>
        </div>
      </div>
    </div>
  );
}
