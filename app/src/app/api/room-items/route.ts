import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/**
 * 꾸미기 아이템 목록.
 * 운영자가 등록한 카탈로그라 사용자별 데이터가 아니다 — 인증이 필요 없다.
 */
export async function GET() {
  const res = await fetch(`${API_URL}/room-items`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
