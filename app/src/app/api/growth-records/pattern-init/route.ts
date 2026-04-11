import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/**
 * BFF: 성장패턴 페이지 초기 로드에 필요한 데이터를 한 번에 반환.
 * - earliestDate: 가장 오래된 기록 날짜
 * - records: from~to 범위의 전체 기록
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ earliestDate: null, records: [] }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const headers = { Authorization: `Bearer ${token}` };

  const [earliestRes, rangeRes] = await Promise.all([
    fetch(
      `${API_URL}/growth-records/earliest?childId=${encodeURIComponent(childId)}`,
      { headers, cache: 'no-store' },
    ).catch(() => null),
    fetch(
      `${API_URL}/growth-records/range?childId=${encodeURIComponent(childId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers, cache: 'no-store' },
    ).catch(() => null),
  ]);

  const earliest = earliestRes?.ok ? await earliestRes.json() : { date: null };
  const records = rangeRes?.ok ? await rangeRes.json() : [];

  return NextResponse.json({
    earliestDate: earliest.date ?? null,
    records,
  });
}
