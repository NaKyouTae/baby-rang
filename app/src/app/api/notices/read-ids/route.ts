import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ ids: [] });

  const res = await fetch(`${API_URL}/notices/read-ids`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
