import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/** 어드민이 띄운 방 보기(/room-view)가 부른다. 로그인 대신 어드민이 발급한 티켓으로 확인한다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const ticket = req.nextUrl.searchParams.get('ticket') ?? '';
  const res = await fetch(`${API_URL}/room-view/${encodeURIComponent(childId)}?ticket=${encodeURIComponent(ticket)}`, {
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
