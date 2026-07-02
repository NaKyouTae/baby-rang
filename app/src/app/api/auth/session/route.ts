import { NextRequest, NextResponse } from 'next/server';

// 세션 확립 라우트 (GET).
//
// 쿠키를 "네비게이션(top-level redirect) 응답"에 실어 설정한다.
// iOS WKWebView 는 fetch() 응답의 Set-Cookie 를 영속화하지 못하는 경우가 있어
// 로그인 후 재로그인 루프가 발생했다. redirect 응답으로 쿠키를 내려주면
// WKWebView 가 안정적으로 영속화한다.
//
// 카카오/애플 콜백(백엔드), 테스트 로그인, 회원가입 완료가 모두 이 라우트로
// 토큰을 넘겨 세션을 확립한다.
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const signupToken = request.nextUrl.searchParams.get('signupToken');
  const origin = request.nextUrl.origin; // open redirect 방지: 목적지는 항상 자기 origin
  const secure = process.env.NODE_ENV === 'production';

  if (signupToken) {
    const res = NextResponse.redirect(new URL('/onboarding', origin));
    res.cookies.set('signup_token', signupToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 30, // 30분
      path: '/',
    });
    return res;
  }

  if (token) {
    const res = NextResponse.redirect(new URL('/home', origin));
    res.cookies.set('access_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180, // 180일 (슬라이딩 세션으로 계속 연장)
      path: '/',
    });
    // 가입 완료/로그인 시점이므로 잔여 signup_token 정리.
    res.cookies.delete('signup_token');
    return res;
  }

  return NextResponse.redirect(new URL('/', origin));
}
