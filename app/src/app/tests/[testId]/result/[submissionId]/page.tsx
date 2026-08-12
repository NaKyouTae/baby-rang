'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getResult, unlockResult } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';

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
      .catch(() => {
        alert('결과를 불러올 수 없습니다.');
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
      } catch {
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

  if (!result) return null;

  const handleUnlock = () => {
    if (!result) return;
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

      {result.isPaid && result.paidContent ? (
        <PaidResultSection content={result.paidContent} />
      ) : (
        <LockedSection
          sections={result.lockedSections}
          onUnlock={handleUnlock}
        />
      )}

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
