'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const search = useSearchParams();
  const calledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const paymentKey = search.get('paymentKey');
  const orderId = search.get('orderId');
  const amount = Number(search.get('amount') ?? '0');
  const redirectTo = search.get('redirectTo') ?? '/home';

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!paymentKey || !orderId || !amount) {
      setError('잘못된 접근입니다.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/payments/${orderId}/toss/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, amount }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message ?? '결제 승인 실패');
        }

        const url = new URL(redirectTo, window.location.origin);
        url.searchParams.set('paymentStatus', 'success');
        url.searchParams.set('orderId', orderId);
        router.replace(url.pathname + url.search);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '결제 승인 처리 중 오류');
      }
    })();
  }, [paymentKey, orderId, amount, redirectTo, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      {error ? (
        <>
          <p className="text-base font-semibold text-red-600">결제 승인 실패</p>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => router.replace(redirectTo)}
            className="mt-4 h-10 rounded-lg bg-black px-4 text-xs text-white"
          >
            돌아가기
          </button>
        </>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
          <p className="text-sm text-neutral-600">결제를 승인 중입니다...</p>
        </>
      )}
    </main>
  );
}
