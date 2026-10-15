import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 아이별 마지막 수면·수유·기저귀 시각. 위젯과 홈 화면이 같이 쓴다.
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json(null, { status: 401 });

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId') ?? '';

  const res = await fetch(
    `${API_URL}/growth-records/widget-summary?childId=${encodeURIComponent(childId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
