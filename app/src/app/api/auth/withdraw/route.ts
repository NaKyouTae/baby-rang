import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/withdraw`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token.value}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ success: false, error: text }, { status: res.status });
  }

  cookieStore.set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
