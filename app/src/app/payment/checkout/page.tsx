'use client';

import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

// 토스 결제위젯 클라이언트 키.
//
// ⚠️ 테스트 키로의 폴백을 두지 않는다.
// 폴백이 있으면 프로덕션에 env 주입이 빠졌을 때 결제가 "성공한 것처럼" 보이면서
// 실제 정산은 일어나지 않는다. 매출이 조용히 새는 게 가장 나쁜 실패 방식이라,
// 키가 없으면 드러내놓고 실패시킨다.
//
// NEXT_PUBLIC_ 변수는 빌드 시점에 인라인되므로, 값을 바꾸면 재빌드·재배포가 필요하다.
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

// 클라이언트 키는 브라우저에 노출되는 공개값이라 로그로 남겨도 안전하다.
// 어떤 상점(MID)으로 결제창이 뜨는지는 전적으로 이 키가 결정하므로,
// "의도한 상점이 아닌 곳으로 결제된다" 류의 사고는 이 값 하나로 판별된다.
// NEXT_PUBLIC_ 은 빌드 시점에 인라인되므로, 여기 찍히는 값 = 실제 배포된 번들의 값이다.
function describeKey(key: string | undefined) {
  if (!key) return { env: 'MISSING', key: '(none)' };
  return {
    env: key.startsWith('live_') ? 'LIVE' : key.startsWith('test_') ? 'TEST' : 'UNKNOWN',
    key,
  };
}

// PG에 넘길 주문번호. Date.now()/Math.random() 은 불순 함수라
// 컴포넌트 안에서 호출하면 react-hooks/purity 가 렌더 중 호출로 보고 막는다.
// 실제로는 결제 버튼 핸들러에서만 부르지만, 모듈 스코프로 빼두는 편이
// "렌더와 무관한 1회성 ID 생성"이라는 의도에도 더 맞는다.
function createProviderId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  const amount = Number(search.get('amount') ?? '990');
  const childId = search.get('childId') ?? undefined;
  const redirectTo = search.get('redirectTo') ?? '/home';
  const productMetaRaw = search.get('productMeta');
  // iOS/Android WebView 안에서는 devtools 콘솔을 볼 수 없다.
  // ?debug=1 로 진입하면 어떤 키로 위젯이 떴는지 화면에 직접 띄운다.
  const debug = search.get('debug') === '1';

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 키 누락은 사용자가 해결할 수 없는 배포 설정 오류다.
  // 위젯을 아예 띄우지 않고(ready=false 유지) 결제 버튼도 비활성 상태로 둔다.
  const configError = CLIENT_KEY
    ? null
    : '결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

  useEffect(() => {
    console.info('[toss] clientKey', describeKey(CLIENT_KEY));
  }, []);

  useEffect(() => {
    if (!CLIENT_KEY) return;
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
      // Payment 생성 없이 providerId만 생성하여 PG에 전달
      const providerId = createProviderId();

      const successUrl = new URL('/payment/success', window.location.origin);
      successUrl.searchParams.set('redirectTo', redirectTo);
      successUrl.searchParams.set('productType', productType);
      successUrl.searchParams.set('productName', productName);
      if (childId) successUrl.searchParams.set('childId', childId);
      if (productMetaRaw) successUrl.searchParams.set('productMeta', productMetaRaw);

      const failUrl = new URL('/payment/fail', window.location.origin);
      failUrl.searchParams.set('redirectTo', redirectTo);

      await widgetsRef.current.requestPayment({
        orderId: providerId,
        orderName: productName,
        successUrl: successUrl.toString(),
        failUrl: failUrl.toString(),
        // 카드사 앱카드/ISP 인증을 마친 뒤 아기랑 iOS 앱으로 복귀시키는 스킴.
        // 없으면 하나카드 등에서 "비정상적인 시도"로 인증이 끊긴다.
        // iOS Info.plist 의 CFBundleURLSchemes 와 반드시 일치해야 한다.
        card: { appScheme: 'babyrang://payment' },
      });
    } catch (e: unknown) {
      // 토스 SDK 에러는 code 를 함께 준다. 상점 상태 문제(NOT_AVAILABLE_PAYMENT 등)와
      // 사용자 취소(USER_CANCEL)를 구분하려면 message 만으로는 부족하다.
      console.error('[toss] requestPayment failed', e);
      const code = (e as { code?: string })?.code;
      const msg = e instanceof Error ? e.message : '결제 요청에 실패했습니다.';
      setError(code ? `[${code}] ${msg}` : msg);
      setLoading(false);
    }
  };

  return (
    <>
      <main
        className="flex min-h-dvh w-full flex-col gap-4 bg-white p-4"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 120px)' }}
      >
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

        {(error ?? configError) && (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
            {error ?? configError}
          </p>
        )}

        {debug && (
          <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-[10px] leading-relaxed text-neutral-700">
            {JSON.stringify(
              {
                ...describeKey(CLIENT_KEY),
                apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '(unset)',
                origin: typeof window === 'undefined' ? '' : window.location.origin,
                amount,
                productType,
                widgetReady: ready,
              },
              null,
              2,
            )}
          </pre>
        )}
      </main>

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white px-4 pt-3"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 12px)' }}
      >
        <p className="mb-2 text-center text-xs text-neutral-500">
          결제 전{' '}
          <a
            href="/refund"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            환불정책
          </a>
          을 확인해 주세요.
        </p>

        <button
          type="button"
          onClick={handlePay}
          disabled={!ready || loading}
          className="h-12 w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? '처리 중...' : `${amount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </>
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
