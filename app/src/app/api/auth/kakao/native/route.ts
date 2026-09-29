import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 네이티브 앱(카카오톡 앱 로그인) 프록시.
//
// 앱이 카카오 SDK 로 받은 access token 을 넘기면 서버가 검증 후
// 우리 토큰(accessToken) 또는 회원가입 토큰(signupToken)을 돌려준다.
//
// 여기서 쿠키를 set 하지 않는 이유는 test-login 과 같다 — WKWebView 가 fetch 응답의
// Set-Cookie 를 영속화하지 못하는 경우가 있어, 클라이언트가 /api/auth/session 으로
// navigation 해서 쿠키를 설정한다.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${API_URL}/auth/kakao/native`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: body?.accessToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({
    accessToken: data.accessToken ?? null,
    signupToken: data.signupToken ?? null,
  });
}
