import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/**
 * 앱 전역 설정(지금은 앱 하단 배너의 광고 네트워크).
 * 어드민이 정하는 값이라 사용자별 데이터가 아니다 — 인증이 필요 없다.
 */
export async function GET() {
  const res = await fetch(`${API_URL}/app-settings`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
