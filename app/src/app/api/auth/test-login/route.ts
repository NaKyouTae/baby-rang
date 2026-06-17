import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 토스페이먼츠 카드사 심사관용 테스트 로그인 프록시.
// 쿠키는 여기서 set 하지 않고 accessToken 만 반환한다.
// 클라이언트가 /api/auth/session 으로 navigation 하여 쿠키를 설정한다
// (WKWebView 가 fetch 응답 쿠키를 영속화 못 하는 문제 회피).
export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/auth/test-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ accessToken: data.accessToken });
}
