'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getQuestions, submitAnswers } from '@/lib/api';
import type { Question, AgeGroup } from '@/lib/api';
import ProgressBar from '../../_components/ProgressBar';
import QuestionCard from '../../_components/QuestionCard';
import ConfirmModal from '@/components/ConfirmModal';

type ScreenState =
  | { type: 'question'; index: number }
  | { type: 'break'; message: string; nextIndex: number }
  | { type: 'submitting' };

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = params.submissionId as string;
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

  const totalQuestions = questions.length;
  const halfPoint = Math.floor(totalQuestions / 2);
  const nearEndPoint = totalQuestions - 5;

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

  const isBreakPoint = useCallback(
    (questionNo: number) => {
      if (totalQuestions === 0) return false;
      return questionNo === halfPoint || questionNo === nearEndPoint;
    },
    [totalQuestions, halfPoint, nearEndPoint],
  );

  const getBreakMessage = useCallback(
    (questionNo: number) => {
      if (questionNo === halfPoint) return '거의 다 왔어요! 힘내세요';
      return '진짜 마지막이에요! 조금만 더 힘내세요';
    },
    [halfPoint],
  );

  const handleAnswer = useCallback(
    (score: number) => {
      if (screen.type !== 'question') return;
      const idx = screen.index;
      const q = questions[idx];
      if (!q) return;

      setAnswers((prev) => ({ ...prev, [q.questionNo]: score }));

      const questionNo = q.questionNo;

      if (questionNo === totalQuestions) return;

      setTimeout(() => {
        if (isBreakPoint(questionNo)) {
          setScreen({ type: 'break', message: getBreakMessage(questionNo), nextIndex: idx + 1 });
          return;
        }

        if (idx < questions.length - 1) {
          setScreen({ type: 'question', index: idx + 1 });
        }
      }, 300);
    },
    [screen, questions, totalQuestions, isBreakPoint, getBreakMessage],
  );

  const handleSubmit = useCallback(async () => {
    if (Object.keys(answers).length < questions.length) {
      setErrorModal({
        title: '아직 응답하지 않은 문항이 있어요',
        description: '모든 문항에 응답해 주세요.',
      });
      return;
    }

    setScreen({ type: 'submitting' });
    try {
      const answerPayload = questions.map((q) => ({
        questionId: q.id,
        questionNo: q.questionNo,
        score: answers[q.questionNo],
      }));

      const result = await submitAnswers(submissionId, answerPayload);
      router.push(`/temperament/result/${result.submissionId}`);
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
  }, [answers, questions, submissionId, router]);

  const handleNext = useCallback(async () => {
    if (screen.type === 'break') {
      setScreen({ type: 'question', index: screen.nextIndex });
      return;
    }

    if (screen.type !== 'question') return;
    const idx = screen.index;
    const q = questions[idx];
    if (!q || !answers[q.questionNo]) return;

    const questionNo = q.questionNo;

    if (isBreakPoint(questionNo)) {
      setScreen({ type: 'break', message: getBreakMessage(questionNo), nextIndex: idx + 1 });
      return;
    }

    if (questionNo === totalQuestions) {
      await handleSubmit();
      return;
    }

    if (idx < questions.length - 1) {
      setScreen({ type: 'question', index: idx + 1 });
    }
  }, [screen, questions, answers, totalQuestions, isBreakPoint, getBreakMessage, handleSubmit]);

  const handlePrev = () => {
    if (screen.type === 'break') {
      setScreen({ type: 'question', index: screen.nextIndex - 1 });
      return;
    }
    if (screen.type === 'question' && screen.index === 0) {
      router.push('/temperament');
      return;
    }
    if (screen.type === 'question' && screen.index > 0) {
      setScreen({ type: 'question', index: screen.index - 1 });
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-dvh gradient-page">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">문항을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (screen.type === 'submitting') {
    return null;
  }

  if (screen.type === 'break') {
    return (
      <main className="min-h-dvh flex flex-col gradient-page">
        <ProgressBar
          current={Object.keys(answers).length}
          total={questions.length}
        />

        <div className="flex-1 flex flex-col items-center justify-center text-center -mt-12">
          <span className="text-8xl mb-4">
            {screen.nextIndex <= halfPoint + 1 ? '💪' : '🔥'}
          </span>
          <p className="text-xl font-bold text-gray-900 mb-3">
            {screen.message}
          </p>
          <p className="text-sm text-gray-400 mb-8">
            {screen.nextIndex <= halfPoint + 1
              ? `${questions.length - (screen.nextIndex - 1)}문항 남았어요`
              : `${totalQuestions - nearEndPoint}문항만 더 답하면 끝이에요`}
          </p>

          <div className="w-full px-5 flex gap-3">
            <button
              onClick={handlePrev}
              className="w-14 h-13 rounded-2xl border border-primary-100 bg-white flex items-center justify-center active:bg-primary-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary-400">
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-4 rounded-2xl text-sm font-bold bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.97] active:bg-primary-600 transition-transform"
            >
              계속하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentQuestion = questions[screen.index];
  const hasAnswer = currentQuestion && !!answers[currentQuestion.questionNo];
  const isLastQuestion = currentQuestion?.questionNo === totalQuestions;

  return (
    <main className="flex flex-col overflow-hidden">
      <ProgressBar
        current={Object.keys(answers).length}
        total={questions.length}
      />

      <div className="flex-1 overflow-y-auto py-4 px-5">
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

      <div className="flex gap-3 px-5">
        <button
          onClick={handlePrev}
          className="w-14 h-13 rounded-xl border border-gray-100 bg-white flex items-center justify-center hover:border-primary-200 hover:bg-primary-50/30 active:scale-[0.98] transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-700">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>

        {isLastQuestion && hasAnswer && (
          <button
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl text-sm font-bold bg-primary-500 text-white shadow-lg shadow-primary-200 active:scale-[0.97] active:bg-primary-600 transition-transform"
          >
            결과 보러가기
          </button>
        )}
      </div>

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
          if (shouldRedirect) router.push('/temperament');
        }}
        onClose={() => setErrorModal(null)}
      />
    </main>
  );
}
