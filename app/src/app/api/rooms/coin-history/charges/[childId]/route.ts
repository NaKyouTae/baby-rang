import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET(req: NextRequest, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const qs = req.nextUrl.searchParams.toString();
  const res = await fetch(
    `${API_URL}/rooms/coin-history/charges/${childId}${qs ? `?${qs}` : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
