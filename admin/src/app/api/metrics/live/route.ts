import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

/** 대시보드 실시간 카운터가 몇 초마다 부른다. */
export async function GET() {
  const token = (await cookies()).get("admin_token")?.value ?? "";
  const res = await fetch(`${API_URL}/admin/metrics/live`, {
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
