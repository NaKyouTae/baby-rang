'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getResult, unlockResult } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';
import { RESULT_ACCESS_DAYS, remainingAccessLabel } from '@/lib/resultAccess';
import { useIsAndroidApp } from '@/lib/isAndroidApp';
import {
  TEMPERAMENT_SKU,
  purchaseWithPlay,
  usePlayProduct,
} from '@/lib/playBilling';

const TEMPERAMENT_PRICE = 990;
import type { TestResult } from '@/lib/api';
import ResultCover from '../../_components/ResultCover';
import DimensionBar from '../../_components/DimensionBar';
import ResultSection from '../../_components/ResultSection';
import LockedSection from '../../_components/LockedSection';
import PaidResultSection from '../../_components/PaidResultSection';
import ReliabilityNotice from '../../_components/ReliabilityNotice';
import { getMockResult } from './_mocks';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;
  const testId = params.testId as string;

  const [initialMock] = useState(() =>
    getMockResult(searchParams.get('mock')),
  );
  // 결제 리다이렉트로 진입했는지는 마운트 시점에 한 번만 확정한다.
  // unlock 후 router.replace 로 쿼리를 지우기 때문에 searchParams 를 계속 읽으면 값이 사라진다.
  const [paymentOrderId] = useState(() =>
    searchParams.get('paymentStatus') === 'success'
      ? searchParams.get('orderId')
      : null,
  );
  const [result, setResult] = useState<TestResult | null>(initialMock);
  const [loading, setLoading] = useState(initialMock === null);
  // Android(TWA) 앱에서는 Play 결제 정책상 Toss 결제 경로를 노출할 수 없다.
  // null 이면 아직 판별 전이므로 결제 UI를 띄우지 않는다. (isAndroidApp.ts 참고)
  const isAndroidApp = useIsAndroidApp();
  // Android 앱에서 Play 결제를 쓸 수 있는지 + 상품 정보를 미리 받아둔다.
  // 클릭 시점에 조회하면 사용자 활성화가 끊겨 결제 시트가 뜨지 않는다. (playBilling.ts 참고)
  const playProduct = usePlayProduct(TEMPERAMENT_SKU);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  // 열람 기간(검사 후 7일)이 지난 결과 — 서버가 410 Gone 으로 알려준다.
  const [expired, setExpired] = useState(false);
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (initialMock) return;
    // 결제 직후 진입이면 아래 unlock 이펙트가 조회를 책임진다.
    // 여기서 같이 조회하면 unlock 이전(isPaid=false) 응답이 2초 지연 뒤에 도착해
    // 먼저 반영된 unlock 결과를 덮어쓰고, 상세 리포트가 잠긴 채로 보인다.
    if (paymentOrderId) return;

    const minDelay = new Promise((r) => setTimeout(r, 2000));
    const fetchData = getResult(submissionId);

    Promise.all([fetchData, minDelay])
      .then(([data]) => {
        setResult(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if ((e as { status?: number })?.status === 410) {
          setExpired(true);
        } else {
          alert('결과를 불러올 수 없습니다.');
        }
        setLoading(false);
      });
  }, [submissionId, initialMock, paymentOrderId]);

  // 결제 성공 리다이렉트 처리: ?paymentStatus=success&orderId=...
  useEffect(() => {
    if (!paymentOrderId) return;
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    (async () => {
      try {
        await unlockResult(submissionId, paymentOrderId);
        setResult(await getResult(submissionId));
      } catch (e: unknown) {
        // 열람 기간이 끝난 결과는 해제도 조회도 불가 — 만료 안내로 넘긴다.
        if ((e as { status?: number })?.status === 410) {
          setExpired(true);
          return;
        }
        alert('결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        // unlock 에 실패해도 빈 화면 대신 무료 결과라도 보여준다.
        const fallback = await getResult(submissionId).catch(() => null);
        if (fallback) setResult(fallback);
      } finally {
        setLoading(false);
        router.replace(`/tests/${testId}/result/${submissionId}`);
      }
    })();
  }, [paymentOrderId, submissionId, testId, router]);

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh gap-4 gradient-page">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">
          {paymentOrderId
            ? '결제 내역을 확인하고 있어요...'
            : '아기의 기질을 분석하고 있어요...'}
        </p>
        <p className="text-xs text-gray-300">잠시만 기다려 주세요.</p>
      </main>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col bg-white min-h-dvh">
        <PageHeader title="검사 결과" variant="back" onAction={() => router.push('/tests')} />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
              <path d="M14.6666 8.00001C14.6666 11.682 11.6819 14.6667 7.99992 14.6667C4.31792 14.6667 1.33325 11.682 1.33325 8.00001C1.33325 4.31801 4.31792 1.33334 7.99992 1.33334C11.6819 1.33334 14.6666 4.31801 14.6666 8.00001Z" stroke="#9CA3AF" strokeLinecap="round" strokeDasharray="0.33 2.33"/>
              <path d="M14.6667 8.00001C14.6667 4.31801 11.682 1.33334 8 1.33334" stroke="#9CA3AF" strokeLinecap="round"/>
              <path d="M8 6V8.66667H10.6667" stroke="#9CA3AF" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[16px] font-medium text-app-black">
            열람 기간이 지난 결과예요.
          </p>
          <p className="mt-2 text-[12px] font-normal text-gray-500">
            검사 결과는 검사한 날로부터 {RESULT_ACCESS_DAYS}일 동안만 볼 수 있어요.
            <br />
            다시 검사하고 지금의 기질을 확인해 보세요.
          </p>
          <button
            onClick={() => router.push(`/tests/${testId}`)}
            className="mt-6 w-full py-3.5 rounded-[4px] bg-gray-100 text-app-black font-semibold text-sm active:scale-[0.97] transition-transform"
          >
            다시 검사하기
          </button>
        </main>
      </div>
    );
  }

  if (!result) return null;

  const remainingLabel = remainingAccessLabel(result.expiresAt);

  // 결제 수단이 확정된 경우에만 유료 유도 UI를 노출한다.
  // 판별 전(null)에 노출하면 앱에서 결제 버튼이 한 프레임 스쳐 보일 수 있다.
  const canPurchase =
    isAndroidApp === false ||
    (isAndroidApp === true && playProduct.status === 'ready');

  // Android(TWA)에서 Play 결제를 진행한다.
  // 웹과 달리 페이지 이동 없이 Play 결제 시트가 뜨고, 승인 후 바로 리포트가 열린다.
  const handlePlayUnlock = async () => {
    if (playLoading) return;
    setPlayLoading(true);
    setPlayError(null);
    try {
      if (playProduct.status !== 'ready') return;
      const purchaseToken = await purchaseWithPlay(
        TEMPERAMENT_SKU,
        playProduct.item,
      );
      // 사용자가 결제 시트를 닫은 경우 — 에러가 아니다.
      if (!purchaseToken) return;

      const res = await fetch('/api/payments/google-play/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: TEMPERAMENT_SKU,
          purchaseToken,
          productType: 'TEMPERAMENT_REPORT',
          productMeta: { submissionId },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.orderId) {
        throw new Error(data?.message ?? '결제 승인에 실패했습니다.');
      }

      await unlockResult(submissionId, data.orderId);
      setResult(await getResult(submissionId));
    } catch (e) {
      setPlayError(
        e instanceof Error ? e.message : '결제 처리 중 오류가 발생했어요.',
      );
    } finally {
      setPlayLoading(false);
    }
  };

  const handleUnlock = () => {
    if (!result) return;
    if (isAndroidApp === null) return;

    if (isAndroidApp) {
      // Play 결제를 쓸 수 없는 빌드에서는 버튼 자체가 안 뜨지만, 방어적으로 한 번 더 막는다.
      if (playProduct.status !== 'ready') return;
      void handlePlayUnlock();
      return;
    }

    const redirectTo = `/tests/${testId}/result/${submissionId}`;
    const productMeta = JSON.stringify({ submissionId });
    const qs = new URLSearchParams({
      productType: 'TEMPERAMENT_REPORT',
      productName: '기질 검사 상세 리포트',
      amount: String(TEMPERAMENT_PRICE),
      redirectTo,
      productMeta,
    });
    router.push(`/payment/checkout?${qs.toString()}`);
  };

  return (
    <div className="flex flex-col bg-white">
      <PageHeader title="검사 결과" variant="back" onAction={() => router.push('/tests')} />
      <main className="flex-1 pb-8 px-6 pt-6">
        {remainingLabel && (
          <p className="mb-4 text-[11px] font-normal text-gray-400 text-center">
            이 결과는 검사 후 {RESULT_ACCESS_DAYS}일간 볼 수 있어요 · {remainingLabel}
          </p>
        )}
        <ResultCover
          primaryType={result.summary.primaryType}
          primaryTypeLabel={result.summary.primaryTypeLabel}
          title={result.summary.title}
          description={result.summary.description}
        />

      {!result.isPaid && (
        <div className="my-6 -mx-6 flex justify-center">
          <KakaoAdBanner unit="DAN-gFh4OIyY7XHzHJyP" />
        </div>
      )}

      <DimensionBar scores={result.scores} />

      <ResultSection title="지금 보이는 강점">
        <div className="space-y-1">
          {result.freeContent.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <Image
                src="/ic-check.svg"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <p className="text-[12px] font-normal text-app-black">{s}</p>
            </div>
          ))}
        </div>
        <div
          className="mt-4 rounded-[4px] p-3"
          style={{ backgroundColor: 'rgba(255, 204, 0, 0.05)' }}
        >
          <p className="text-[12px] font-semibold text-app-black mb-2">
            양육 TIP
          </p>
          <p className="text-[12px] font-normal text-app-black">
            {result.freeContent.tip}
          </p>
        </div>
      </ResultSection>

      {/*
        이미 결제한 리포트는 어디서 열든 그대로 보여준다.

        아직 결제 전이라면 결제 수단이 확정된 경우에만 잠금 안내를 노출한다.
          · 웹            → Toss (결제 화면으로 이동)
          · Android + Play 결제 가능 → Play 결제 시트
          · Android + Play 결제 불가 → 아무것도 노출하지 않음 (Billing 없는 구 빌드)
        ⚠️ 마지막 경우에 "웹사이트에서 구매하세요" 같은 안내나 링크를 넣으면 안 된다.
        외부 결제 유도는 그 자체로 Play 결제 정책 위반이다.
      */}
      {result.isPaid && result.paidContent ? (
        <PaidResultSection content={result.paidContent} />
      ) : canPurchase ? (
        <>
          <LockedSection
            sections={result.lockedSections}
            onUnlock={handleUnlock}
          />
          {playLoading && (
            <p className="mt-2 text-center text-[12px] text-gray-500">
              결제를 진행하고 있어요...
            </p>
          )}
          {playError && (
            <p className="mt-2 text-center text-[12px]" style={{ color: '#DC2626' }}>
              {playError}
            </p>
          )}
          {/*
            앱(WebView) 안에서는 devtools 콘솔을 볼 수 없어서, 결제가 막혔을 때
            원인을 추적할 방법이 없다. 실패했을 때만 조회된 상품 정보를 화면에 띄운다.
            결제가 정상 동작하는 것을 확인한 뒤 지워도 된다.
          */}

        </>
      ) : null}

      {!result.isReliable && result.reliabilityMsg && (
        <ReliabilityNotice message={result.reliabilityMsg} />
      )}

      <div className="mt-6">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          이 검사는 아기의 기질 경향을 이해하기 위한 참고 자료이며, 의학적 진단이나
          전문 심리 평가를 대신하지 않습니다.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            const url = window.location.href;
            if (typeof navigator !== 'undefined' && navigator.share) {
              try {
                await navigator.share({ title: '아기랑 기질 검사 결과', url });
              } catch {}
              return;
            }
            try {
              await navigator.clipboard?.writeText(url);
              alert('링크가 복사되었습니다.');
            } catch {}
          }}
          className="py-3.5 rounded-[4px] bg-gray-100 text-app-black font-semibold text-sm active:scale-[0.97] transition-transform"
        >
          공유하기
        </button>
        <button
          onClick={() => router.push(`/tests/${testId}`)}
          className="py-3.5 rounded-[4px] bg-gray-200 text-gray-500 font-semibold text-sm active:scale-[0.97] transition-transform"
        >
          다시 검사하기
        </button>
      </div>
      </main>

    </div>
  );
}
