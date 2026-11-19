import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/** 스플래시 홍보 이미지 목록. iOS·Android 앱이 로그인과 상관없이 받아 다음 실행용으로 저장한다. */
export async function GET() {
  const res = await fetch(`${API_URL}/launch-ads`, { cache: 'no-store' });
  return NextResponse.json(await res.json(), { status: res.status });
}
