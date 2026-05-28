import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// signup_token을 httpOnly 쿠키에 저장. 회원가입 완료 시점에 삭제됨.
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  const cookieStore = await cookies();

  cookieStore.set('signup_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 30, // 30분
    path: '/',
  });

  return NextResponse.json({ success: true });
}

// signup_token에 담긴 카카오 프로필 미리보기 (이메일/닉네임 표시용).
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('signup_token')?.value;
  if (!token) {
    return NextResponse.json({ profile: null });
  }

  try {
    const res = await fetch(`${API_URL}/auth/signup/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupToken: token }),
    });
    if (!res.ok) {
      return NextResponse.json({ profile: null });
    }
    const profile = await res.json();
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('signup_token');
  return NextResponse.json({ success: true });
}
