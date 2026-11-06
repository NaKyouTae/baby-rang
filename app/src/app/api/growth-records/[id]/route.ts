import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 저장한 기기의 소켓 id 를 넘겨, 서버가 그 기기에는 변경 알림을 다시 보내지 않게 한다.
function withSocketId(request: NextRequest, headers: Record<string, string>) {
  const socketId = request.headers.get('x-socket-id');
  return socketId ? { ...headers, 'x-socket-id': socketId } : headers;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const res = await fetch(`${API_URL}/growth-records/${id}`, {
    method: 'PATCH',
    headers: withSocketId(request, { Authorization: `Bearer ${token}` }),
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/growth-records/${id}`, {
    method: 'DELETE',
    headers: withSocketId(request, { Authorization: `Bearer ${token}` }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
