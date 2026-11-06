import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

async function token() {
  return (await cookies()).get('access_token')?.value;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const t = await token();
  if (!t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/rooms/${childId}`, {
    headers: { Authorization: `Bearer ${t}` },
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const t = await token();
  if (!t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 저장한 기기의 소켓 id 를 넘겨, 서버가 그 기기에는 변경 알림을 다시 보내지 않게 한다.
  const socketId = req.headers.get('x-socket-id');
  const res = await fetch(`${API_URL}/rooms/${childId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t}`,
      ...(socketId ? { 'x-socket-id': socketId } : {}),
    },
    body: JSON.stringify(await req.json()),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
