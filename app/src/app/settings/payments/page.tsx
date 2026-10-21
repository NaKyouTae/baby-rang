'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPayments, type PaymentItem } from '@/lib/api';
import { canGoBack } from '@/lib/navHistory';
import ConfirmModal from '@/components/ConfirmModal';
import Loading from '@/components/Loading';

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

/** "26.04.23 14:36" — 보석함 내역과 같은 꼴. */
function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatAmount(n: number, currency = 'KRW') {
  if (currency === 'KRW') return `${n.toLocaleString('ko-KR')}원`;
  return `${n.toLocaleString()} ${currency}`;
}

/** 보석 묶음은 디자인상 "보석 20개 충전" 으로 읽힌다. 다른 상품은 이름 그대로 둔다. */
function titleOf(item: PaymentItem) {
  return item.productName.startsWith('보석') ? `${item.productName} 충전` : item.productName;
}

/** 완료가 아닌 건만 상태를 덧붙인다. 대부분이 완료라 매번 적으면 소음이다. */
const STATUS_LABEL: Partial<Record<PaymentItem['status'], { label: string; color: string }>> = {
  FAILED: { label: '실패', color: '#FF4040' },
  CANCELLED: { label: '취소', color: '#0078F0' },
  REFUNDED: { label: '환불', color: '#34C759' },
  PARTIAL_REFUNDED: { label: '부분환불', color: '#34C759' },
};

/** 픽셀 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

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

  // 뒤로 갈 곳이 없으면 들어온 자리인 마이페이지로 보낸다
  const goBack = () => (canGoBack() ? router.back() : router.replace('/home?my=1'));

  return (
    // 화면 높이에 고정하고 리스트 상자만 스크롤한다. 페이지 전체가 스크롤되면 제목 줄까지 밀려 올라간다.
    <div
      className="h-screen-safe overflow-hidden flex flex-col gap-[10px] bg-[#F7F8F9] px-[20px]"
      style={{
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        paddingBottom: 'calc(var(--bottom-nav-space) + 20px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />

      <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={goBack} aria-label="뒤로가기" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <h1 className="text-[#121212] text-[16px] leading-none font-normal">결제 내역</h1>
        {/* 오른쪽은 비워 둔다 — 뒤로가기 버튼과 같은 폭이라 제목이 가운데에 남는다 */}
        <span aria-hidden className="size-[24px]" />
      </div>

      <div className={`${BOX} flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain`}>
        {loading ? (
          <Notice><Loading /></Notice>
        ) : error ? (
          <Notice>결제 내역을 불러오지 못했습니다.</Notice>
        ) : items.length === 0 ? (
          <Notice>결제 내역이 없습니다.</Notice>
        ) : (
          <ul>
            {items.map((item) => {
              const isPaid = item.status === 'PAID';
              const storeMethod = storeMethodOf(item);
              const status = STATUS_LABEL[item.status];
              // 누를 수 있는 건 영수증이 있는 토스 결제와 안내를 띄울 인앱결제뿐이다.
              const clickable = isPaid && (Boolean(item.receiptUrl) || Boolean(storeMethod));
              return (
                <li key={item.id} className="border-b border-[#121212]">
                  <button
                    type="button"
                    disabled={!clickable}
                    className="w-full flex flex-col items-start gap-[4px] p-[10px] text-left active:bg-[rgba(255,210,0,0.1)] disabled:active:bg-transparent"
                    onClick={() => {
                      if (item.receiptUrl) {
                        window.open(item.receiptUrl, '_blank', 'noopener,noreferrer');
                        return;
                      }
                      // 인앱결제는 영수증 URL 이 없다. 스토어 구입 내역 경로를 안내한다.
                      if (storeMethod) setReceiptGuide(storeMethod);
                    }}
                  >
                    <span className="max-w-full truncate text-[#121212] text-[16px] leading-[1.4]">
                      {titleOf(item)}
                    </span>
                    <span className="flex items-center gap-[10px] text-[#808991] text-[14px] leading-[1.4] tabular-nums">
                      <span>{formatAmount(item.amount, item.currency)}</span>
                      <span>･</span>
                      <span>{formatDate(item.approvedAt || item.createdAt)}</span>
                      {status && (
                        <>
                          <span>･</span>
                          <span style={{ color: status.color }}>{status.label}</span>
                        </>
                      )}
                    </span>
                  </button>
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

/** 목록이 비었을 때 상자 한가운데 놓는 글. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-[10px]">
      <div className="text-[#808991] text-[14px] leading-[1.4]">{children}</div>
    </div>
  );
}
