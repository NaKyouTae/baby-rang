import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

async function token() {
  return (await cookies()).get('access_token')?.value;
}

/** 사용자 화면 설정 — 초기 화면, 홈 기록 버튼 구성. 기기가 아니라 계정에 저장된다. */
export async function GET() {
  const t = await token();
  if (!t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/screen-preference`, {
    headers: { Authorization: `Bearer ${t}` },
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(req: NextRequest) {
  const t = await token();
  if (!t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/screen-preference`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify(await req.json()),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
