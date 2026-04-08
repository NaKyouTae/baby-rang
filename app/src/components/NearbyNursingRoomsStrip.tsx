"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NursingRoom {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const SAMPLE_NURSING_ROOMS: NursingRoom[] = [
  { name: "서울역 수유실", address: "서울특별시 용산구 한강대로 405", lat: 37.5547, lng: 126.9707 },
  { name: "시청역 수유실", address: "서울특별시 중구 세종대로 110", lat: 37.5666, lng: 126.9784 },
  { name: "강남역 수유실", address: "서울특별시 강남구 강남대로 396", lat: 37.4979, lng: 127.0276 },
  { name: "잠실역 수유실", address: "서울특별시 송파구 올림픽로 지하 265", lat: 37.5133, lng: 127.1001 },
  { name: "홍대입구역 수유실", address: "서울특별시 마포구 양화로 160", lat: 37.5571, lng: 126.9236 },
];

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

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLoc({ lat: 37.5666, lng: 126.9784 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLoc({ lat: 37.5666, lng: 126.9784 })
    );
  }, []);

  const nearest = userLoc
    ? [...SAMPLE_NURSING_ROOMS]
        .map((r) => ({ ...r, dist: distanceKm(userLoc, r) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
    : SAMPLE_NURSING_ROOMS.slice(0, 3).map((r) => ({ ...r, dist: 0 }));

  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 mb-2">가까운 수유실</h2>
      <div className="space-y-2">
      {nearest.map((room) => (
        <Link
          key={room.name}
          href={`/nursing-room?room=${encodeURIComponent(room.name)}`}
          className="relative block h-12 rounded-[4px] overflow-hidden bg-white border border-gray-200"
        >
          <div className="relative h-full flex items-center justify-between px-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">{room.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{room.address}</div>
            </div>
            {userLoc && (
              <div className="ml-2 text-[10px] text-gray-500 shrink-0">
                {room.dist < 1 ? `${Math.round(room.dist * 1000)}m` : `${room.dist.toFixed(1)}km`}
              </div>
            )}
          </div>
        </Link>
      ))}
      </div>
    </section>
  );
}
