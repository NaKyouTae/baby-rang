import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// "회원가입" 버튼 클릭 시점에만 호출됨.
// signup_token + 사용자 입력을 백엔드로 전달 → 백엔드가 user 생성 + access_token 발급.
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

  // 가입 성공: access_token 쿠키 세팅, signup_token은 삭제.
  if (data?.accessToken) {
    cookieStore.set('access_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }
  cookieStore.delete('signup_token');

  return NextResponse.json({ success: true, user: data.user ?? null });
}
