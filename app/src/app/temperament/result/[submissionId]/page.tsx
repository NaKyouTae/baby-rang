'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getResult, unlockResult } from '@/lib/api';

const TEMPERAMENT_PRICE = 4900;
import type { TestResult } from '@/lib/api';
import ResultCover from '../../_components/ResultCover';
import DimensionBar from '../../_components/DimensionBar';
import LockedSection from '../../_components/LockedSection';
import PaidResultSection from '../../_components/PaidResultSection';
import ReliabilityNotice from '../../_components/ReliabilityNotice';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const unlockedRef = useRef(false);

  useEffect(() => {
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
  }, [submissionId]);

  // 결제 성공 리다이렉트 처리: ?paymentStatus=success&orderId=...
  useEffect(() => {
    if (unlockedRef.current) return;
    if (searchParams.get('paymentStatus') !== 'success') return;
    const orderId = searchParams.get('orderId');
    if (!orderId) return;
    unlockedRef.current = true;

    (async () => {
      try {
        await unlockResult(submissionId, orderId);
        const updated = await getResult(submissionId);
        setResult(updated);
        router.replace(`/temperament/result/${submissionId}`);
      } catch {
        alert('결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    })();
  }, [searchParams, submissionId, router]);

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-dvh gap-4 gradient-page">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">아이의 기질을 분석하고 있어요...</p>
        <p className="text-xs text-gray-300">잠시만 기다려 주세요.</p>
      </main>
    );
  }

  if (!result) return null;

  const handleUnlock = () => {
    if (!result) return;
    const redirectTo = `/temperament/result/${submissionId}`;
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
    <main className="min-h-dvh pb-8 px-6">
      <ResultCover
        primaryType={result.summary.primaryType}
        primaryTypeLabel={result.summary.primaryTypeLabel}
        title={result.summary.title}
        description={result.summary.description}
      />

      <DimensionBar scores={result.scores} />

      <div className="mt-2">
        <h3 className="text-base font-bold text-gray-900 mb-3">
          지금 보이는 강점
        </h3>
        {result.freeContent.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <span className="text-primary-500 mt-0.5 text-sm">&#10003;</span>
            <p className="text-sm text-gray-700">{s}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="bg-primary-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary-600 mb-1">
            짧은 양육 팁
          </p>
          <p className="text-sm text-gray-700">{result.freeContent.tip}</p>
        </div>
      </div>

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
        <button
          onClick={() => router.push('/temperament')}
          className="w-full py-3.5 rounded-xl border border-primary-200 bg-white text-primary-600 font-semibold text-sm active:bg-primary-50 active:scale-[0.97] transition-all"
        >
          다시 검사하기
        </button>
      </div>

      <div className="mt-4">
        <p className="text-[11px] text-gray-300 text-center leading-relaxed">
          이 검사는 아이의 기질 경향을 이해하기 위한 참고 자료이며, 의학적 진단이나
          전문 심리 평가를 대신하지 않습니다.
        </p>
      </div>
    </main>
  );
}
