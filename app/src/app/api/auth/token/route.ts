import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token.value}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    // 401/403 → 토큰 실제 무효(진짜 로그아웃)
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    // 그 외 실패(5xx/타임아웃 등) → 세션 유지, 일시적 실패로 표시(user는 null로 덮지 않도록 stale)
    if (!res.ok) {
      return NextResponse.json({ authenticated: true, user: null, stale: true });
    }
    const user = await res.json();
    return NextResponse.json({ authenticated: true, user });
  } catch {
    // 네트워크/타임아웃 — 로그인 유지, 일시 실패
    return NextResponse.json({ authenticated: true, user: null, stale: true });
  }
}

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  const cookieStore = await cookies();

  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180, // 180일 (슬라이딩 세션으로 계속 연장)
    path: "/",
  });

  return NextResponse.json({ success: true });
}
