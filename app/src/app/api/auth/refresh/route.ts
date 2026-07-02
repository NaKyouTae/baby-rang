import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180일

// 슬라이딩 세션: 유효한 토큰을 새 토큰으로 교체해 쿠키 만료를 계속 뒤로 민다.
// 앱을 열 때마다 호출되면 활동 중인 사용자는 사실상 무한 로그인 상태가 된다.
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // 401이면 토큰 무효 — 갱신 실패(로그아웃 판단은 상위에 위임, 여기선 쿠키 유지)
      return NextResponse.json({ ok: false }, { status: res.status });
    }
    const data = await res.json();
    const fresh = data?.accessToken;
    if (typeof fresh !== 'string' || !fresh) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    cookieStore.set('access_token', fresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
    return NextResponse.json({ ok: true });
  } catch {
    // 네트워크/타임아웃 — 기존 쿠키 유지, 다음 기회에 다시 슬라이드
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
