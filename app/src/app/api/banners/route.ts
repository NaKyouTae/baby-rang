import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET() {
  // 배너는 자주 안 바뀜 — 상위 fetch를 5분 revalidate로 캐시하고 브라우저/CDN 캐시 헤더 부여
  const res = await fetch(`${API_URL}/banners`, { next: { revalidate: 300 } });
  const data = await res.json();
  return NextResponse.json(data, {
    status: res.status,
    headers: res.ok
      ? { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' }
      : undefined,
  });
}
