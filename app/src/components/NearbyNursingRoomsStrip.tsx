"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedFetch } from "@/hooks/appCache";

interface NursingRoom {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type LocStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function NearbyNursingRoomsStrip() {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [rooms, setRooms] = useState<NursingRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("granted");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const TTL = 3 * 60_000; // 3분 캐시
    (async () => {
      try {
        const [reportedData, publicData] = await Promise.all([
          cachedFetch<{ rooms?: any[] }>("/api/nursing-rooms", TTL).catch(() => ({ rooms: [] })),
          cachedFetch<{ rooms?: any[] }>("/api/nursing-rooms/public", TTL).catch(() => ({ rooms: [] })),
        ]);

        const parse = (data: { rooms?: any[] }): NursingRoom[] =>
          (data.rooms ?? [])
            .filter((r: any) => typeof r.lat === "number" && typeof r.lng === "number")
            .map((r: any) => ({
              name: r.name,
              address: r.address ?? [r.roadAddress, r.detailLocation].filter(Boolean).join(" "),
              lat: r.lat,
              lng: r.lng,
            }));

        const reported = parse(reportedData);
        const publicList = parse(publicData);
        const seen = new Set<string>();
        const merged: NursingRoom[] = [];
        for (const list of [reported, publicList]) {
          for (const r of list) {
            const key = `${r.name}|${r.lat.toFixed(4)}|${r.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(r);
          }
        }
        if (!cancelled) {
          setRooms(merged);
          setRoomsLoaded(true);
        }
      } catch {
        if (!cancelled) setRoomsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nearest = userLoc
    ? [...rooms]
        .map((r) => ({ ...r, dist: distanceKm(userLoc, r) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
    : [];

  const showLoading = !roomsLoaded || locStatus === "loading" || locStatus === "idle";
  const showLocationPrompt =
    roomsLoaded && (locStatus === "denied" || locStatus === "unsupported");
  const showEmpty = roomsLoaded && locStatus === "granted" && nearest.length === 0;

  return (
    <section>
      <h2 className="text-[13px] font-bold text-gray-900 mb-2">가까운 수유실</h2>

      {showLocationPrompt && (
        <button
          type="button"
          onClick={requestLocation}
          className="w-full h-14 rounded-[8px] bg-white border border-gray-200 active:opacity-70 flex items-center justify-center gap-1.5 px-4"
        >
          <span className="text-xs font-semibold text-gray-900">
            위치 권한을 허용하면 가까운 수유실을 보여드려요
          </span>
          <span className="text-[11px] text-gray-500">›</span>
        </button>
      )}

      {showEmpty && (
        <div className="h-14 rounded-[8px] bg-white border border-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-500">주변에 등록된 수유실이 없어요</span>
        </div>
      )}

      {!showLoading && !showLocationPrompt && !showEmpty && (
      <div className="space-y-2">
      {nearest.map((room, idx) => (
        <Link
          key={room.name}
          href={`/nursing-room?room=${encodeURIComponent(room.name)}&lat=${room.lat}&lng=${room.lng}&addr=${encodeURIComponent(room.address)}`}
          className="relative block h-14 rounded-[8px] overflow-hidden bg-white border border-gray-200 active:opacity-70"
        >
          <div className="relative h-full flex items-center justify-between px-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="text-xs font-bold text-gray-900 truncate">{room.name}</div>
                {idx === 0 && userLoc && (
                  <span className="shrink-0 text-[9px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                    가장 가까워요
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{room.address}</div>
            </div>
            {userLoc && (
              <div className="ml-2 shrink-0 text-right">
                <div className="text-[11px] font-bold text-gray-900">
                  {room.dist < 1 ? `${Math.round(room.dist * 1000)}m` : `${room.dist.toFixed(1)}km`}
                </div>
                <div className="text-[9px] text-gray-400">길찾기 ›</div>
              </div>
            )}
          </div>
        </Link>
      ))}
      </div>
      )}
    </section>
  );
}
