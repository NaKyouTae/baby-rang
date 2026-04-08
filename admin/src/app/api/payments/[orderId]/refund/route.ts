import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const body = await req.json();
  const token = (await cookies()).get("admin_token")?.value ?? "";
  const res = await fetch(
    `${API_URL}/admin/payments/${encodeURIComponent(orderId)}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify(body),
    },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
