import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

async function token() {
  return (await cookies()).get("admin_token")?.value ?? "";
}

export async function GET() {
  const res = await fetch(`${API_URL}/admin/banners`, {
    headers: { "x-admin-token": await token() },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/admin/banners`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": await token() },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
