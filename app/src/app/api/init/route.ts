import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      children: [],
    });
  }

  // Vercel Function 내부에서 백엔드 API 병렬 호출.
  // 미국→한국 백엔드 지연/콜드스타트로 매달리지 않도록 3초 타임아웃.
  const [authRes, childrenRes] = await Promise.all([
    fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    }).catch(() => null),
    fetch(`${API_URL}/children`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null),
  ]);

  const authenticated = true;
  const user = authRes?.ok ? await authRes.json() : null;
  const children = childrenRes?.ok ? await childrenRes.json() : [];

  return NextResponse.json({ authenticated, user, children });
}
