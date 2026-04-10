'use client';

import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

type ProductType =
  | 'TEMPERAMENT_REPORT'
  | 'WONDER_WEEKS_PREMIUM'
  | 'NURSING_ROOM_PREMIUM'
  | 'OTHER';

function CheckoutContent() {
  const router = useRouter();
  const search = useSearchParams();

  const productType = (search.get('productType') ?? 'TEMPERAMENT_REPORT') as ProductType;
  const productName = search.get('productName') ?? '기질 검사 상세 리포트';
  const amount = Number(search.get('amount') ?? '4900');
  const childId = search.get('childId') ?? undefined;
  const redirectTo = search.get('redirectTo') ?? '/home';
  const productMetaRaw = search.get('productMeta');

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(CLIENT_KEY);
        if (cancelled) return;

        const widgets = tossPayments.widgets({ customerKey: 'ANONYMOUS' });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: 'KRW', value: amount });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#toss-payment-methods',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#toss-agreement',
            variantKey: 'AGREEMENT',
          }),
        ]);

        if (!cancelled) setReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('결제 위젯을 불러오지 못했습니다.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amount]);

  const handlePay = async () => {
    if (!widgetsRef.current || loading) return;
    setLoading(true);
    setError(null);

    try {
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const createRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          productType,
          productName,
          amount,
          provider: 'TOSS',
          childId,
          productMeta: productMetaRaw ? safeJson(productMetaRaw) : undefined,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.message ?? '주문 생성 실패');
      }

      const successUrl = new URL('/payment/success', window.location.origin);
      successUrl.searchParams.set('redirectTo', redirectTo);
      const failUrl = new URL('/payment/fail', window.location.origin);
      failUrl.searchParams.set('redirectTo', redirectTo);

      await widgetsRef.current.requestPayment({
        orderId,
        orderName: productName,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '결제 요청에 실패했습니다.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh w-full flex-col gap-4 bg-white p-4">
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-500"
          type="button"
        >
          ← 뒤로
        </button>
        <h1 className="text-base font-semibold">결제하기</h1>
        <span className="w-10" />
      </header>

      <section className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">상품</p>
        <p className="mt-1 text-sm font-medium">{productName}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-neutral-500">결제 금액</span>
          <span className="text-lg font-bold">{amount.toLocaleString()}원</span>
        </div>
      </section>

      <div id="toss-payment-methods" />
      <div id="toss-agreement" />

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || loading}
        className="mt-2 h-12 w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? '처리 중...' : `${amount.toLocaleString()}원 결제하기`}
      </button>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-white" />}>
      <CheckoutContent />
    </Suspense>
  );
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
