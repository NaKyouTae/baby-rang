import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

/** 아기방 보기 — 앱 화면에 넘길 짧은 티켓을 받는다. */
export async function POST(_req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const token = (await cookies()).get("admin_token")?.value ?? "";
  const res = await fetch(`${API_URL}/room-view/${encodeURIComponent(childId)}/ticket`, {
    method: "POST",
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
