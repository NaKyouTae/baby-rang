import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 네이티브 앱(네이버 앱 로그인) 프록시.
//
// 앱이 네이버 SDK 로 받은 refresh token 을 넘기면 서버가 우리 client_id·secret 으로
// 갱신해 "우리 앱이 발급한 토큰"인지 확인하고 우리 토큰(accessToken)을 돌려준다.
// 신규 회원이면 이 시점에 가입까지 끝난다.
//
// 쿠키는 여기서 set 하지 않는다 — 카카오 쪽과 같은 이유로, 클라이언트가
// /api/auth/session 으로 navigation 해서 설정한다.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const res = await fetch(`${API_URL}/auth/naver/native`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: body?.refreshToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ accessToken: data.accessToken ?? null });
}
