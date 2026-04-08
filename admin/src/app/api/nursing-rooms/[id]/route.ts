import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

async function token() {
  return (await cookies()).get("admin_token")?.value ?? "";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${API_URL}/admin/nursing-rooms/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-token": await token() },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/admin/nursing-rooms/${id}`, {
    method: "DELETE",
    headers: { "x-admin-token": await token() },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
