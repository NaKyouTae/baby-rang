import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("admin_token")?.value;
  // 이미 로그인했으면 로그인 화면을 건너뛴다 — 로그인 주소를 즐겨찾기로 들어와도 다시 로그인하지 않게
  if (pathname.startsWith("/login")) {
    return token ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // public/ 의 정적 파일(header-logo.png 등)까지 가로채면 로그인 화면의 로고가
  // /login 으로 307 리다이렉트되어 깨진 이미지로 보인다.
  // 확장자가 있는 경로(= 파일)는 전부 인증 검사에서 제외한다.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
