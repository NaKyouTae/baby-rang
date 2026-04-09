import { NextResponse } from "next/server";

// sooyusil.com 오픈 API 프록시 (DB 저장 없이 단순 중계)
// https://sooyusil.com/home/39.htm
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SooyusilRoom {
  roomNo?: string;
  roomName?: string;
  cityName?: string;
  zoneName?: string;
  townName?: string;
  roomTypeCode?: string;
  roomTypeName?: string;
  address?: string;
  location?: string;
  managerTelNo?: string;
  fatherUseCode?: string;
  fatherUseNm?: string;
  latitude?: string;
  longitude?: string;
  gpsLat?: string;
  gpsLong?: string;
}

export async function GET(req: Request) {
  const apiKey = process.env.SOOYUSIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ rooms: [], message: "SOOYUSIL_API_KEY is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  params.set("confirmApiKey", apiKey);
  for (const key of ["roomName", "address", "zoneName", "cityName", "townName", "roomTypeCode", "fatherUseCode"]) {
    const v = searchParams.get(key);
    if (v) params.set(key, v);
  }

  try {
    const res = await fetch(`https://sooyusil.com/api/nursingRoomJSON.do?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ rooms: [], message: `upstream ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const list: SooyusilRoom[] = Array.isArray(data?.roomList) ? data.roomList : [];
    const rooms = list
      .map((r) => {
        const lat = Number(r.gpsLat ?? r.latitude);
        const lng = Number(r.gpsLong ?? r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          name: r.roomName ?? "수유실",
          address: r.address ?? [r.zoneName, r.cityName, r.townName].filter(Boolean).join(" "),
          lat,
          lng,
          tel: r.managerTelNo || undefined,
          type: r.roomTypeName || undefined,
          detailLocation: r.location || undefined,
          dadAvailable: r.fatherUseCode === "1",
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      { rooms, message: data?.message ?? "ok" },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (e) {
    console.error("[nursing-rooms/public] fetch failed", e);
    return NextResponse.json({ rooms: [], message: "fetch failed" }, { status: 502 });
  }
}
