import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:18080";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { token } = (await res.json()) as { token: string };
  const out = NextResponse.json({ ok: true });
  // 한 번 로그인하면 사실상 계속 유지한다(1년). 로그아웃 버튼을 누르거나 쿠키를 지우면 풀린다.
  out.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return out;
}

export async function DELETE() {
  const out = NextResponse.json({ ok: true });
  out.cookies.delete("admin_token");
  return out;
}
