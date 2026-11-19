import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/** 스플래시 홍보 이미지 노출 집계. 앱이 보여 줄 때 보낸다. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/launch-ads/${encodeURIComponent(id)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await req.json()),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
