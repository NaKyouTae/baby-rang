"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedFetch } from "@/hooks/appCache";
import { palette } from "@/lib/colors";

interface NursingRoom {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type LocStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

const DEFAULT_LOCATION = { lat: 37.5666, lng: 126.9784 }; // 서울시청

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
      setUserLoc(DEFAULT_LOCATION);
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("granted");
      },
      () => {
        setUserLoc(DEFAULT_LOCATION);
        setLocStatus("denied");
      },
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

  const isLocationResolved = locStatus === "granted" || locStatus === "denied" || locStatus === "unsupported";
  const showLoading = !roomsLoaded || !isLocationResolved;
  const showLocationPrompt = roomsLoaded && (locStatus === "denied" || locStatus === "unsupported");
  const showEmpty = roomsLoaded && isLocationResolved && !showLocationPrompt && nearest.length === 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-medium text-black leading-none tracking-normal">가까운 수유실</h2>

        <Link href="/nursing-room" className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium leading-[12px]">더보기<img src="/right-arrow-ico.svg" alt="" width={10} height={10} /></Link>
      </div>

      {showLocationPrompt && (
        <div className="w-full rounded-[8px] bg-white border border-gray-200 py-8 px-4 flex flex-col items-center gap-3">
          <span className="text-[12px] font-normal text-gray-500 text-center leading-snug">
            가까운 수유실을 찾으려면 위치 권한을 허용해 주세요.
          </span>
          <button
            type="button"
            onClick={requestLocation}
            className="px-4 py-2 rounded-[4px] bg-gray-400 active:bg-gray-500 text-[12px] font-semibold text-white"
          >
            설정 바로가기
          </button>
        </div>
      )}

      {showEmpty && (
        <div className="h-14 rounded-[8px] bg-white border border-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-500">주변에 등록된 수유실이 없어요</span>
        </div>
      )}

      {!showLoading && !showLocationPrompt && !showEmpty && (
      <div className="flex flex-col gap-2">
      {nearest.map((room, idx) => (
        <Link
          key={room.name}
          href={`/nursing-room?room=${encodeURIComponent(room.name)}&lat=${room.lat}&lng=${room.lng}&addr=${encodeURIComponent(room.address)}`}
          className="block rounded-[8px] bg-white border border-gray-200 p-[10px] active:bg-gray-50"
        >
          <div className="flex flex-col gap-[4px]">
              <div className="flex items-center gap-1.5">
                <div className="text-[12px] font-medium text-black truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>{room.name}</div>
                {idx === 0 && locStatus === "granted" && (
                  <span
                    className="shrink-0 text-[12px] font-medium leading-none px-1 rounded-[2px]"
                    style={{ color: palette.red, backgroundColor: 'rgba(255, 59, 48, 0.15)', height: '16px', display: 'inline-flex', alignItems: 'center' }}
                  >
                    가장 가까워요
                  </span>
                )}
                {locStatus === "granted" && (
                  <div className="ml-auto shrink-0 text-[12px] font-normal text-black" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {room.dist < 1 ? `${Math.round(room.dist * 1000)}m` : `${room.dist.toFixed(1)}km`}
                  </div>
                )}
              </div>
              <div className="text-[12px] font-normal truncate" style={{ fontFamily: 'Pretendard, sans-serif', color: palette.gray500 }}>{room.address}</div>
          </div>
        </Link>
      ))}
      </div>
      )}
    </section>
  );
}
