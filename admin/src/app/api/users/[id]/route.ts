import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

async function token() {
  return (await cookies()).get("admin_token")?.value ?? "";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    headers: { "x-admin-token": await token() },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
