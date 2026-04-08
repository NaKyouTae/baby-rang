'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function PaymentFailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const calledRef = useRef(false);

  const code = search.get('code') ?? 'UNKNOWN';
  const message = search.get('message') ?? '결제가 취소되었거나 실패했습니다.';
  const orderId = search.get('orderId');
  const redirectTo = search.get('redirectTo') ?? '/home';

  useEffect(() => {
    if (calledRef.current || !orderId) return;
    calledRef.current = true;
    fetch(`/api/payments/${orderId}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ failureCode: code, failureMessage: message }),
    }).catch(() => {});
  }, [orderId, code, message]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-base font-semibold text-red-600">결제 실패</p>
      <p className="text-xs text-neutral-500">[{code}] {message}</p>
      <button
        type="button"
        onClick={() => router.replace(redirectTo)}
        className="mt-4 h-10 rounded-lg bg-black px-4 text-xs text-white"
      >
        돌아가기
      </button>
    </main>
  );
}
