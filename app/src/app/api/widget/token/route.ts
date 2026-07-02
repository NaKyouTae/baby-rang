import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 홈 화면 위젯 전용 토큰을 발급해 페이지 JS로 반환한다.
// access_token은 httpOnly 쿠키라 JS가 직접 못 읽으므로, 이 BFF가 쿠키로 백엔드를
// 호출해 위젯 토큰을 받아온 뒤 body로 내려준다. 페이지는 이 값을 네이티브 브릿지로 전달.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/widget-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
