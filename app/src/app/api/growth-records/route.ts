import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 저장한 기기의 소켓 id 를 넘겨, 서버가 그 기기에는 변경 알림을 다시 보내지 않게 한다.
function withSocketId(request: NextRequest, headers: Record<string, string>) {
  const socketId = request.headers.get('x-socket-id');
  return socketId ? { ...headers, 'x-socket-id': socketId } : headers;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId') ?? '';
  const date = searchParams.get('date') ?? '';

  const res = await fetch(
    `${API_URL}/growth-records?childId=${encodeURIComponent(childId)}&date=${encodeURIComponent(date)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const res = await fetch(`${API_URL}/growth-records`, {
    method: 'POST',
    headers: withSocketId(request, { Authorization: `Bearer ${token}` }),
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
