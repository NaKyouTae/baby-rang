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
    });
    if (!res.ok) {
      return NextResponse.json({ authenticated: true, user: null });
    }
    const user = await res.json();
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: true, user: null });
  }
}

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  const cookieStore = await cookies();

  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });

  return NextResponse.json({ success: true });
}
