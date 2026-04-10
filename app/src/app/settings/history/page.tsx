'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getHistory, type HistoryItem } from '@/lib/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getHistory(1, 50);
        if (!cancelled) setItems(res.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 pt-[max(env(safe-area-inset-top),12px)] pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          aria-label="뒤로 가기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[16px] font-semibold text-gray-900">검사 이력</h1>
      </header>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-20 text-center text-sm text-gray-500">
            이력을 불러오지 못했어요.
            <br />
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">아직 검사 이력이 없어요</p>
              <p className="mt-1 text-sm text-gray-500">기질검사를 시작해 우리 아이를 알아보세요</p>
            </div>
            <Link
              href="/temperament"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white active:bg-primary-600"
            >
              기질검사 하러가기
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/temperament"
              className="mb-4 flex items-center justify-between rounded-2xl bg-primary-500 px-5 py-4 shadow-sm active:bg-primary-600"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">우리 아이 기질 검사하러 가기</p>
                  <p className="mt-0.5 text-[12px] text-white/80">새로운 검사를 시작해보세요</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.submissionId}>
                <Link
                  href={`/temperament/result/${item.submissionId}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-gray-50 transition-colors"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">
                        {item.primaryTypeLabel || item.primaryType}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.isPaid
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.isPaid ? '상세' : '요약'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(item.completedAt)}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </li>
            ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
