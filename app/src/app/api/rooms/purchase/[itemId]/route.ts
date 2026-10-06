import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const childId = req.nextUrl.searchParams.get('childId') ?? '';
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(
    `${API_URL}/rooms/purchase/${itemId}?childId=${encodeURIComponent(childId)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
