import { cookies } from 'next/headers';
import BottomNav from '@/components/BottomNavServer';
import GrowthRecordClient from './GrowthRecordClient';
import type { GrowthRecordInitData } from './GrowthRecordClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function GrowthRecordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  let initialData: GrowthRecordInitData | null = null;

  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // 1단계: children 먼저 가져오기
      const childrenRes = await fetch(`${API_URL}/children`, {
        headers,
        cache: 'no-store',
      });
      if (childrenRes.ok) {
        const children = await childrenRes.json();
        if (Array.isArray(children) && children.length > 0) {
          // birthDate 내림차순 정렬 후 첫 번째 아이
          const sorted = [...children].sort((a: any, b: any) =>
            (b.birthDate ?? '').localeCompare(a.birthDate ?? ''),
          );
          const firstChild = sorted[0];
          const today = todayString();
          const from = shiftDate(today, -2); // PAGE_SIZE=3 → today-2
          const to = today;

          // 2단계: quick-buttons, earliest, range를 병렬 호출
          const [quickRes, earliestRes, rangeRes] = await Promise.all([
            fetch(`${API_URL}/growth-quick-buttons`, {
              headers,
              cache: 'no-store',
            }).catch(() => null),
            fetch(
              `${API_URL}/growth-records/earliest?childId=${encodeURIComponent(firstChild.id)}`,
              { headers, cache: 'no-store' },
            ).catch(() => null),
            fetch(
              `${API_URL}/growth-records/range?childId=${encodeURIComponent(firstChild.id)}&from=${from}&to=${to}`,
              { headers, cache: 'no-store' },
            ).catch(() => null),
          ]);

          const quickData = quickRes?.ok ? await quickRes.json() : { types: [] };
          const earliestData = earliestRes?.ok
            ? await earliestRes.json()
            : { date: null };
          const records = rangeRes?.ok ? await rangeRes.json() : [];

          initialData = {
            children: sorted,
            quickButtons: quickData.types ?? [],
            earliestDate: earliestData.date ?? null,
            records,
            from,
            to,
          };
        }
      }
    } catch {
      // 실패 시 initialData=null → 클라이언트에서 기존 방식으로 로드
    }
  }

  return (
    <>
      <GrowthRecordClient initialData={initialData} />
      <BottomNav />
    </>
  );
}
