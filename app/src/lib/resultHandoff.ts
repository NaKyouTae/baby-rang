'use client';

import type { TestResult } from '@/lib/api';

// 검사 제출 응답에 담겨 온 결과를 결과 페이지로 넘겨주는 통로.
//
// 서버는 제출(submitAnswers) 시점에 이미 결과를 만들어 저장한다. 그대로 돌려받아
// 결과 페이지에 넘기면, 방금 저장한 것을 다시 읽어오는 왕복 한 번이 사라진다.
//
// sessionStorage 를 쓰는 이유: router.push 로 넘어가는 사이 RSC 페이로드를 받느라
// 컴포넌트가 새로 마운트되므로, 메모리 변수보다 확실하다.
//
// ⚠️ 반드시 한 번만 쓰고 지운다(take). 남겨두면 결제 후 다시 들어왔을 때
//    결제 이전 상태(isPaid=false)가 되살아나 상세 리포트가 잠긴 채로 보인다.

const KEY = 'temperament-result-handoff';

export function stashResult(submissionId: string, result: TestResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ submissionId, result }));
  } catch {
    // 저장이 막힌 환경에서는 결과 페이지가 평소처럼 조회한다. 동작에는 문제없다.
  }
}

/** 남겨둔 결과를 꺼내면서 지운다. 다른 검사의 결과면 무시한다. */
export function takeResult(submissionId: string): TestResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as {
      submissionId?: string;
      result?: TestResult;
    };
    if (parsed?.submissionId !== submissionId || !parsed.result) return null;
    return parsed.result;
  } catch {
    return null;
  }
}
