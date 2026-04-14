'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPayments, type PaymentItem } from '@/lib/api';
import { palette } from '@/lib/colors';

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function formatAmount(n: number, currency = 'KRW') {
  if (currency === 'KRW') return `${n.toLocaleString('ko-KR')}원`;
  return `${n.toLocaleString()} ${currency}`;
}

const STATUS_META: Record<
  PaymentItem['status'],
  { label: string; className: string }
> = {
  PENDING: { label: '대기중', className: 'bg-gray-100 text-gray-500' },
  PAID: { label: '결제완료', className: 'bg-primary-100 text-primary-700' },
  FAILED: { label: '실패', className: 'bg-red-50 text-red-500' },
  CANCELLED: { label: '취소', className: 'bg-gray-100 text-gray-500' },
  REFUNDED: { label: '환불', className: 'bg-gray-100 text-gray-500' },
  PARTIAL_REFUNDED: { label: '부분환불', className: 'bg-gray-100 text-gray-500' },
};

export default function PaymentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPayments(50, 0);
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

  const openReceipt = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white px-6">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 pt-[var(--safe-area-top)] pb-3 border-b border-gray-100 -mx-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          aria-label="뒤로 가기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[16px] font-semibold text-gray-900">결제 내역</h1>
      </header>

      <div className="pt-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-20 text-center text-sm text-gray-500">
            결제 내역을 불러오지 못했어요.
            <br />
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">아직 결제 내역이 없어요</p>
              <p className="mt-1 text-sm text-gray-500">유료 결과를 구매하면 여기에 표시돼요</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <li key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-gray-900 truncate">
                          {item.productName}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[15px] font-bold text-gray-900">
                        {formatAmount(item.amount, item.currency)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDate(item.approvedAt || item.createdAt)}
                        {item.cardCompany ? ` · ${item.cardCompany}` : ''}
                        {item.cardNumberMask ? ` ${item.cardNumberMask}` : ''}
                      </p>
                    </div>
                  </div>

                  {item.status === 'PAID' && item.receiptUrl && (
                    <button
                      type="button"
                      onClick={() => openReceipt(item.receiptUrl!)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-[13px] font-semibold text-gray-800 active:bg-gray-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      영수증 보기
                    </button>
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
