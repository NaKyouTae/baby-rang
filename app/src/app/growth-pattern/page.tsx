import { cookies } from 'next/headers';
import BottomNav from '@/components/BottomNavServer';
import GrowthPatternClient from './GrowthPatternClient';
import type { GrowthPatternInitData } from './GrowthPatternClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function startOfWeek(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

const INITIAL_WEEKS = 4;

export default async function GrowthPatternPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  let initialData: GrowthPatternInitData | null = null;

  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const childrenRes = await fetch(`${API_URL}/children`, {
        headers,
        cache: 'no-store',
      });
      if (childrenRes.ok) {
        const children = await childrenRes.json();
        if (Array.isArray(children) && children.length > 0) {
          const sorted = [...children].sort((a: any, b: any) =>
            (b.birthDate ?? '').localeCompare(a.birthDate ?? ''),
          );
          const firstChild = sorted[0];
          const todayStr = toDateStr(new Date());
          const currentWeekStart = startOfWeek(todayStr);
          const weekStarts = Array.from({ length: INITIAL_WEEKS }, (_, i) =>
            shiftDate(currentWeekStart, (i - (INITIAL_WEEKS - 1)) * 7),
          );
          const from = weekStarts[0];
          const to = shiftDate(weekStarts[weekStarts.length - 1], 6);

          const [earliestRes, rangeRes] = await Promise.all([
            fetch(
              `${API_URL}/growth-records/earliest?childId=${encodeURIComponent(firstChild.id)}`,
              { headers, cache: 'no-store' },
            ).catch(() => null),
            fetch(
              `${API_URL}/growth-records/range?childId=${encodeURIComponent(firstChild.id)}&from=${from}&to=${to}`,
              { headers, cache: 'no-store' },
            ).catch(() => null),
          ]);

          const earliestData = earliestRes?.ok
            ? await earliestRes.json()
            : { date: null };
          const records = rangeRes?.ok ? await rangeRes.json() : [];

          initialData = {
            children: sorted,
            earliestDate: earliestData.date ?? null,
            records,
            from,
            to,
          };
        }
      }
    } catch {
      // fallback
    }
  }

  return (
    <>
      <GrowthPatternClient initialData={initialData} />
      <BottomNav />
    </>
  );
}
