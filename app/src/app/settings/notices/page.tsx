'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';
import PageHeader from '@/components/PageHeader';

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
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day}. ${hh}:${mm}`;
}

export default function NoticesPage() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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

  const handleToggle = useCallback(
    (id: string) => {
      const isOpening = openId !== id;
      setOpenId(isOpening ? id : null);
      if (isOpening && isAuthenticated && !readIds.has(id)) {
        setReadIds((prev) => new Set(prev).add(id));
        fetch(`/api/notices/${id}/read`, { method: 'POST' }).catch(() => {});
      }
    },
    [openId, isAuthenticated, readIds],
  );

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="공지사항" variant="back" />

      <div className="mt-3 px-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-20 text-center text-sm text-gray-500">
            공지사항을 불러오지 못했어요.
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-2.5">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path
                  d="M14.6666 6.99998V7.99998C14.6666 11.1426 14.6666 12.714 13.6899 13.69C12.7146 14.6666 11.1426 14.6666 7.99992 14.6666C4.85725 14.6666 3.28592 14.6666 2.30925 13.69C1.33325 12.7146 1.33325 11.1426 1.33325 7.99998C1.33325 4.85731 1.33325 3.28598 2.30925 2.30931C3.28659 1.33331 4.85725 1.33331 7.99992 1.33331H8.99992"
                  stroke="black"
                  strokeLinecap="round"
                />
                <path
                  d="M4.6665 9.33331H10.6665M4.6665 11.6666H8.6665"
                  stroke="black"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-black">등록된 공지사항이 없어요.</p>
            <p className="text-xs font-normal text-gray-500 mt-1">
              새로운 소식이 생기면 이곳에서 알려드릴게요.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const open = openId === n.id;
              return (
                <li
                  key={n.id}
                  className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(n.id)}
                    className="w-full text-left px-4 py-3.5 active:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="shrink-0 rounded-sm px-1.5 h-[18px] inline-flex items-center text-[11px] font-semibold"
                            style={{ backgroundColor: '#FF2D5514', color: '#FF2D55' }}
                          >
                            공지
                          </span>
                          <p className="text-[15px] font-medium text-black truncate">
                            {n.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-normal text-gray-500">
                          {formatDate(n.publishedAt)}
                        </p>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={palette.gray400}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-200 pt-3">
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
