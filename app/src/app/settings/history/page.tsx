'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, type HistoryItem } from '@/lib/api';
import { palette } from '@/lib/colors';
import PageHeader from '@/components/PageHeader';
import BannerCarousel from '@/components/BannerCarousel';

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}. ${m}. ${day}. ${hh}:${mm}`;
}

export default function HistoryPage() {
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
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="테스트 이력" variant="back" />

      <div className="mt-6 px-6">
        <BannerCarousel />
      </div>

      <div className="mt-6 px-6">
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
          <div className="mt-6 rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-2.5">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <g clipPath="url(#clip_history_empty)">
                  <path d="M14.6666 8.00001C14.6666 11.682 11.6819 14.6667 7.99992 14.6667C4.31792 14.6667 1.33325 11.682 1.33325 8.00001C1.33325 4.31801 4.31792 1.33334 7.99992 1.33334C11.6819 1.33334 14.6666 4.31801 14.6666 8.00001Z" stroke="black" strokeLinecap="round" strokeDasharray="0.33 2.33"/>
                  <path d="M14.6667 8.00001C14.6667 4.31801 11.682 1.33334 8 1.33334" stroke="black" strokeLinecap="round"/>
                  <path d="M8 6V8.66667H10.6667" stroke="black" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip_history_empty">
                    <rect width="16" height="16" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <p className="text-sm font-medium text-black">아직 진행한 테스트가 없어요.</p>
            <p className="text-xs font-normal text-gray-500 mt-1">다양한 테스트로 우리 아기를 이해해 보세요</p>
            <Link
              href="/temperament"
              className="mt-3 inline-flex items-center justify-center rounded py-1.5 px-2 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: palette.teal }}
            >
              테스트 시작하기
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.submissionId}>
                <Link
                  href={`/temperament/result/${item.submissionId}`}
                  className="flex items-center gap-3 h-16 rounded-lg border border-gray-200 bg-gray-100 px-4 active:bg-gray-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[16px] font-medium text-black truncate">
                        {item.primaryTypeLabel || item.primaryType}
                      </p>
                      <span
                        className="shrink-0 rounded-sm px-1.5 h-4 inline-flex items-center text-xs font-medium"
                        style={{
                          backgroundColor: item.isPaid ? '#FF2D5514' : '#515C6614',
                          color: item.isPaid ? '#FF2D55' : palette.gray600,
                        }}
                      >
                        {item.isPaid ? '상세' : '일반'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-xs font-normal text-gray-500">
                      <span className="truncate">{item.primaryTypeLabel || item.primaryType}</span>
                      <span>|</span>
                      <span>{formatDate(item.completedAt)}</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
