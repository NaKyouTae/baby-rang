import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// iOS 인앱결제 승인 프록시.
// 금액도 영수증도 넘기지 않는다 — 서버가 트랜잭션 ID로 Apple 에 되물어 확정한다.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const res = await fetch(`${API_URL}/payments/app-store/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
