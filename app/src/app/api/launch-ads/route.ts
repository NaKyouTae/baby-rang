import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/** 런치 광고 목록. 로그인과 상관없이 받는다. */
export async function GET() {
  const res = await fetch(`${API_URL}/launch-ads`, { cache: 'no-store' });
  return NextResponse.json(await res.json(), { status: res.status });
}
