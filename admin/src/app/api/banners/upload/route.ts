import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

async function token() {
  return (await cookies()).get("admin_token")?.value ?? "";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const res = await fetch(`${API_URL}/admin/banners/upload`, {
    method: "POST",
    headers: { "x-admin-token": await token() },
    body: formData,
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
