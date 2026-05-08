import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const lat = sp.get('lat') ?? '';
  const lng = sp.get('lng') ?? '';
  const res = await fetch(
    `${API_URL}/nursing-rooms/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    { cache: 'no-store' },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
