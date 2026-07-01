import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET() {
  // 수유실 목록은 거의 안 바뀜 — 상위 fetch 1시간 revalidate + 브라우저/CDN 캐시 헤더
  const res = await fetch(`${API_URL}/nursing-rooms`, { next: { revalidate: 3600 } });
  const data = await res.json();
  return NextResponse.json(data, {
    status: res.status,
    headers: res.ok
      ? { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
      : undefined,
  });
}
