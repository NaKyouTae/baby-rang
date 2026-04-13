import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

interface BulkRecord {
  childId: string;
  type: string;
  startAt: string;
  endAt?: string | null;
  memo?: string | null;
  data?: string | null;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { records } = (await request.json()) as { records: BulkRecord[] };
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'records required' }, { status: 400 });
  }

  let success = 0;
  let failed = 0;

  for (const rec of records) {
    const form = new FormData();
    form.append('childId', rec.childId);
    form.append('type', rec.type);
    form.append('startAt', rec.startAt);
    if (rec.endAt) form.append('endAt', rec.endAt);
    if (rec.memo) form.append('memo', rec.memo);
    if (rec.data) form.append('data', rec.data);

    try {
      const res = await fetch(`${API_URL}/growth-records`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) success++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ success, failed, total: records.length });
}
