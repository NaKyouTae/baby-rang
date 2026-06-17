import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// "회원가입" 버튼 클릭 시점에만 호출됨.
// signup_token + 사용자 입력을 백엔드로 전달 → 백엔드가 user 생성 + access_token 발급.
//
// 쿠키는 여기서 set 하지 않고 accessToken 만 반환한다. 클라이언트가
// /api/auth/session 으로 navigation 하여 access_token 쿠키를 설정한다
// (WKWebView 가 fetch 응답 쿠키를 영속화 못 하는 문제 회피). signup_token 정리도
// session 라우트의 token 분기에서 함께 처리된다.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const signupToken = cookieStore.get('signup_token')?.value;
  if (!signupToken) {
    return NextResponse.json(
      { error: '회원가입 세션이 만료되었어요. 다시 로그인해 주세요.' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, signupToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({
    accessToken: data.accessToken ?? null,
    user: data.user ?? null,
  });
}
