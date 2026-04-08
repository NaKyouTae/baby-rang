import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get('query') ?? '';
  const res = await fetch(
    `${API_URL}/nursing-rooms/geocode?query=${encodeURIComponent(query)}`,
    { cache: 'no-store' },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
