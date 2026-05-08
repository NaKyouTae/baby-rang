'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getQuestions, submitAnswers } from '@/lib/api';
import type { Question, AgeGroup } from '@/lib/api';
import ProgressBar from '../../_components/ProgressBar';
import QuestionCard from '../../_components/QuestionCard';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';

type ScreenState =
  | { type: 'question'; index: number }
  | { type: 'submitting' };

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;
  const testId = params.testId as string;
  const ageGroup = (searchParams.get('ageGroup') || 'after_first') as AgeGroup;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [screen, setScreen] = useState<ScreenState>({ type: 'question', index: 0 });
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{
    title: string;
    description: string;
    redirectToStart?: boolean;
  } | null>(null);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const handleHeaderBack = useCallback(() => {
    setExitModalOpen(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    setExitModalOpen(false);
    router.push(`/tests/${testId}`);
  }, [router, testId]);

  const exitModalIcon = (
    <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.0827 14.3493C10.9734 7.44933 12.9187 4 16 4C19.0814 4 21.0267 7.44933 24.9174 14.3493L25.4027 15.208C28.636 20.9413 30.2534 23.808 28.792 25.904C27.3307 28 23.7147 28 16.4854 28H15.5147C8.28537 28 4.66937 28 3.20804 25.904C1.7467 23.808 3.36404 20.9413 6.59737 15.208L7.0827 14.3493Z" stroke="black" strokeWidth="2" />
        <path d="M16 10.6665V17.3332" stroke="black" strokeWidth="2" strokeLinecap="round" />
        <path d="M16.0001 22.6667C16.7365 22.6667 17.3334 22.0697 17.3334 21.3333C17.3334 20.597 16.7365 20 16.0001 20C15.2637 20 14.6667 20.597 14.6667 21.3333C14.6667 22.0697 15.2637 22.6667 16.0001 22.6667Z" fill="black" />
      </svg>
    </div>
  );

  const exitModal = (
    <ConfirmModal
      open={exitModalOpen}
      icon={exitModalIcon}
      title="테스트 종료하기"
      description={'테스트를 종료하시겠어요?\n지금 나가면 진행 중인 내용이 저장되지 않아요.'}
      cancelLabel="계속 진행하기"
      confirmLabel="종료하기"
      onConfirm={handleExitConfirm}
      onClose={() => setExitModalOpen(false)}
    />
  );

  const totalQuestions = questions.length;

  useEffect(() => {
    getQuestions(ageGroup)
      .then((data) => {
        setQuestions(data.questions);
        setLabels(data.scale.labels);
        setLoading(false);
      })
      .catch(() => {
        setErrorModal({
          title: '문항을 불러올 수 없어요',
          description: '네트워크 상태를 확인하고 다시 시도해 주세요.',
        });
      });
  }, [ageGroup]);

  const submitWithAnswers = useCallback(
    async (finalAnswers: Record<number, number>) => {
      setScreen({ type: 'submitting' });
      try {
        const answerPayload = questions.map((q) => ({
          questionId: q.id,
          questionNo: q.questionNo,
          score: finalAnswers[q.questionNo],
        }));

        const result = await submitAnswers(submissionId, answerPayload);
        router.push(`/tests/${testId}/result/${result.submissionId}`);
      } catch (e) {
        const err = e as Error & { status?: number };
        setScreen({ type: 'question', index: questions.length - 1 });
        if (err.status === 404) {
          setErrorModal({
            title: '검사 세션이 만료되었어요',
            description:
              '이 검사는 더 이상 유효하지 않아요.\n처음부터 다시 시작해 주세요.',
            redirectToStart: true,
          });
        } else if (err.status === 400) {
          setErrorModal({
            title: '응답을 제출할 수 없어요',
            description: err.message || '응답 내용을 확인하고 다시 시도해 주세요.',
          });
        } else {
          setErrorModal({
            title: '제출에 실패했어요',
            description: err.message || '잠시 후 다시 시도해 주세요.',
          });
        }
      }
    },
    [questions, submissionId, router, testId],
  );

  const handleAnswer = useCallback(
    (score: number) => {
      if (screen.type !== 'question') return;
      const idx = screen.index;
      const q = questions[idx];
      if (!q) return;

      const newAnswers = { ...answers, [q.questionNo]: score };
      setAnswers(newAnswers);

      const questionNo = q.questionNo;

      setTimeout(() => {
        if (questionNo === totalQuestions) {
          submitWithAnswers(newAnswers);
          return;
        }
        if (idx < questions.length - 1) {
          setScreen({ type: 'question', index: idx + 1 });
        }
      }, 300);
    },
    [screen, questions, answers, totalQuestions, submitWithAnswers],
  );

  const handlePrev = () => {
    if (screen.type === 'question' && screen.index === 0) {
      router.push(`/tests/${testId}`);
      return;
    }
    if (screen.type === 'question' && screen.index > 0) {
      setScreen({ type: 'question', index: screen.index - 1 });
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="테스트" variant="back" />
        <main className="flex items-center justify-center min-h-[60dvh] gradient-page">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">문항을 불러오는 중...</p>
          </div>
        </main>
      </>
    );
  }

  if (screen.type === 'submitting') {
    return null;
  }

  const currentQuestion = questions[screen.index];

  return (
    <>
      <PageHeader title="테스트" variant="back" onAction={handleHeaderBack} />
      <ProgressBar
        current={Object.keys(answers).length}
        total={questions.length}
      />
      <main className="flex flex-col overflow-hidden px-6">
        <div className="flex-1 overflow-y-auto pt-12 pb-6">
          {currentQuestion && (
            <QuestionCard
              questionNo={currentQuestion.questionNo}
              totalQuestions={questions.length}
              text={currentQuestion.text}
              labels={labels}
              value={answers[currentQuestion.questionNo] ?? null}
              onChange={handleAnswer}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            aria-label="이전 문항"
            className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center active:scale-[0.98] transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 8H2.66663M6.66663 12L2.66663 8L6.66663 4" stroke="#BBC0C5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </main>

      <ConfirmModal
        open={!!errorModal}
        emoji="⚠️"
        title={errorModal?.title ?? ''}
        description={errorModal?.description ?? ''}
        confirmLabel={errorModal?.redirectToStart ? '다시 시작하기' : '확인'}
        hideCancel
        onConfirm={() => {
          const shouldRedirect = errorModal?.redirectToStart;
          setErrorModal(null);
          if (shouldRedirect) router.push(`/tests/${testId}`);
        }}
        onClose={() => setErrorModal(null)}
      />
      {exitModal}
    </>
  );
}
