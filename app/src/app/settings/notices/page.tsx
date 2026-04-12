'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function NoticesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notices', { cache: 'no-store' });
        if (!res.ok) throw new Error('불러오기 실패');
        const data = await res.json();
        if (!cancelled) setItems(data.notices ?? []);
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
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)]">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          aria-label="뒤로가기"
          className="p-2"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          공지사항
        </h1>
      </header>

      <div className="px-4 mt-3">
        {loading && (
          <div className="py-20 text-center text-sm text-gray-400">불러오는 중...</div>
        )}
        {error && !loading && (
          <div className="py-20 text-center text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="py-20 text-center text-sm text-gray-400">
            등록된 공지사항이 없어요
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <ul className="rounded-2xl bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
            {items.map((n) => {
              const open = openId === n.id;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : n.id)}
                    className="w-full text-left px-5 py-4 active:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {n.isPinned && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">
                          고정
                        </span>
                      )}
                      <p className="flex-1 text-[15px] text-gray-900 font-medium truncate">
                        {n.title}
                      </p>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${open ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(n.publishedAt)}
                    </p>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 -mt-1 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
