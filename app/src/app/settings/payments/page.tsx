'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPayments, type PaymentItem } from '@/lib/api';
import { palette } from '@/lib/colors';
import PageHeader from '@/components/PageHeader';
import ConfirmModal from '@/components/ConfirmModal';

/**
 * 인앱결제 영수증 안내.
 *
 * 스토어 결제는 영수증을 애플·구글이 발행한다. App Store Server API 도
 * Play Developer API 도 영수증 URL 을 돌려주지 않아서(트랜잭션 정보만 준다),
 * 우리 서버에는 receiptUrl 이 비어 있다. 그래서 링크로 보내는 대신
 * 각 스토어의 구입 내역 경로를 안내한다.
 *
 * 판별은 기기가 아니라 결제 건의 method 로 한다. iOS 에서 산 결제를
 * 웹이나 안드로이드에서 열어볼 수 있기 때문이다.
 */
const STORE_RECEIPT_GUIDE = {
  APP_STORE: {
    title: 'App Store 영수증 안내',
    description:
      '이 결제의 영수증은 Apple에서 발행합니다.\n\n설정 → Apple 계정 → 미디어 및 구입 항목\n→ 구입 내역에서 확인하실 수 있어요.',
  },
  GOOGLE_PLAY: {
    title: 'Google Play 영수증 안내',
    description:
      '이 결제의 영수증은 Google에서 발행합니다.\n\nPlay 스토어 → 프로필 → 결제 및 정기 결제\n→ 예산 및 주문 내역에서 확인하실 수 있어요.',
  },
} as const;

type StoreMethod = keyof typeof STORE_RECEIPT_GUIDE;

function storeMethodOf(item: PaymentItem): StoreMethod | null {
  const m = item.method;
  return m === 'APP_STORE' || m === 'GOOGLE_PLAY' ? m : null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day}. ${hh}:${mm}`;
}

function formatAmount(n: number, currency = 'KRW') {
  if (currency === 'KRW') return `${n.toLocaleString('ko-KR')}원`;
  return `${n.toLocaleString()} ${currency}`;
}

const STATUS_META: Record<
  PaymentItem['status'],
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: '처리중', bg: '#515C6614', text: '#515C66' },
  PAID: { label: '완료', bg: '#FF2D5514', text: '#FF2D55' },
  FAILED: { label: '실패', bg: '#515C6614', text: '#515C66' },
  CANCELLED: { label: '취소', bg: '#34C75914', text: '#34C759' },
  REFUNDED: { label: '환불', bg: '#3078C914', text: '#3078C9' },
  PARTIAL_REFUNDED: { label: '부분환불', bg: '#3078C914', text: '#3078C9' },
};

export default function PaymentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 인앱결제 건을 눌렀을 때 띄울 안내. null 이면 닫힌 상태다.
  const [receiptGuide, setReceiptGuide] = useState<StoreMethod | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPayments(50, 0);
        // PENDING 제외, 나머지(완료/실패/취소/환불) 표시
        if (!cancelled) setItems((res.items ?? []).filter((i: PaymentItem) => i.status !== 'PENDING'));
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
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)]">
      <PageHeader title="결제 내역" variant="back" />

      <div className="px-5 pt-6">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-20 text-center text-sm text-gray-500">
            결제 내역을 불러오지 못했어요.
            <br />
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-black">아직 결제한 내역이 없어요.</p>
            <p className="text-xs font-normal text-gray-500 mt-1">구매한 내역이 이곳에 표시돼요.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              const isPaid = item.status === 'PAID';
              const storeMethod = storeMethodOf(item);
              // 누를 수 있는 건 영수증이 있는 토스 결제와 안내를 띄울 인앱결제뿐이다.
              const clickable = isPaid && (Boolean(item.receiptUrl) || Boolean(storeMethod));
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 h-16 rounded-lg border border-gray-200 bg-gray-100 px-4 transition-colors ${
                    clickable ? 'cursor-pointer active:bg-gray-200' : ''
                  }`}
                  onClick={() => {
                    if (!clickable) return;
                    if (item.receiptUrl) {
                      window.open(item.receiptUrl, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    // 인앱결제는 영수증 URL 이 없다. 스토어 구입 내역 경로를 안내한다.
                    if (storeMethod) setReceiptGuide(storeMethod);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[16px] font-medium text-black truncate">
                        {item.productName}
                      </p>
                      <span
                        className="shrink-0 rounded-sm px-1.5 h-4 inline-flex items-center text-xs font-medium"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-xs font-normal text-gray-500">
                      <span>{formatAmount(item.amount, item.currency)}</span>
                      <span>|</span>
                      <span>{formatDate(item.approvedAt || item.createdAt)}</span>
                    </div>
                  </div>
                  {clickable && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={receiptGuide !== null}
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 3v18l2-1.5L8 21l2-1.5L12 21l2-1.5L16 21l2-1.5L20 21V3l-2 1.5L16 3l-2 1.5L12 3l-2 1.5L8 3 6 4.5 4 3Z" />
              <line x1="8" y1="9" x2="16" y2="9" />
              <line x1="8" y1="13" x2="14" y2="13" />
            </svg>
          </div>
        }
        title={receiptGuide ? STORE_RECEIPT_GUIDE[receiptGuide].title : ''}
        description={receiptGuide ? STORE_RECEIPT_GUIDE[receiptGuide].description : ''}
        confirmLabel="확인"
        hideCancel
        onConfirm={() => setReceiptGuide(null)}
        onClose={() => setReceiptGuide(null)}
      />
    </div>
  );
}
