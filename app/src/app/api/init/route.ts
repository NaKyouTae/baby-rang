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

  // 백엔드 API 병렬 호출. 콜드스타트 대비 8초 타임아웃.
  const [authRes, childrenRes] = await Promise.all([
    fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }).catch(() => null),
    fetch(`${API_URL}/children`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    }).catch(() => null),
  ]);

  // 401/403 → 토큰 실제 무효(진짜 로그아웃). 그 외 실패는 세션 유지(일시적).
  if (authRes && (authRes.status === 401 || authRes.status === 403)) {
    return NextResponse.json({ authenticated: false, user: null, children: [] });
  }

  const user = authRes?.ok ? await authRes.json() : null;
  // 중요: children 조회가 실패/타임아웃하면 [](없음)이 아니라 null(미확정)로 반환한다.
  // 클라이언트는 null이면 캐시하지 않고 스스로 재조회 → "아이 없음" 오표시 방지.
  const children = childrenRes?.ok ? await childrenRes.json() : null;

  // profile 또는 children 중 하나라도 일시 실패면 stale 표시
  const stale = !authRes?.ok || !childrenRes?.ok;

  return NextResponse.json({ authenticated: true, user, children, stale });
}
