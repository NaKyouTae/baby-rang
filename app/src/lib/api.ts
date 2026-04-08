// Next.js API 라우트(proxy)를 통해 NestJS 서버로 전달된다.
// 인증은 httpOnly 쿠키(access_token)로 proxy에서 부착하므로 클라이언트는 신경쓰지 않는다.
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `API error: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// 타입 정의
export interface Question {
  id: string;
  questionNo: number;
  dimension: string;
  dimensionLabel: string;
  text: string;
  sortOrder: number;
}

export interface QuestionsResponse {
  questions: Question[];
  scale: {
    min: number;
    max: number;
    labels: Record<string, string>;
  };
  notice: string;
}

export interface DimensionScore {
  raw: number;
  score: number;
  level: 'low' | 'medium' | 'high';
  label: string;
}

export interface StrengthItem {
  title: string;
  description: string;
}

export interface EmotionTip {
  action: string;
  example: string;
}

export interface PaidContent {
  typeDetail: string;
  dimensionDetails: Record<
    string,
    { score: number; level: string; description: string; parentTips: string[] }
  >;
  strengths: StrengthItem[];
  cautions: StrengthItem[];
  emotionCoaching: { title: string; tips: EmotionTip[] };
  learningStyle: { recommended: string[]; difficult: string[] };
  socialGuide: { patterns: string[]; parentTips: string[] };
  routineGuide: string[];
  combinationInsight: {
    dimensions: string[];
    label: string;
    description: string;
  } | null;
  parentAdvice: string[];
  closingMessage: string;
}

export interface TestResult {
  resultId: string;
  isPaid: boolean;
  isReliable: boolean;
  reliabilityMsg: string | null;
  summary: {
    primaryType: string;
    primaryTypeLabel: string;
    emotionModifier: boolean;
    title: string;
    description: string;
  };
  scores: Record<string, DimensionScore>;
  freeContent: {
    strengths: string[];
    tip: string;
  };
  lockedSections: string[];
  paidContent?: PaidContent;
}

export interface HistoryItem {
  submissionId: string;
  resultId: string;
  primaryType: string;
  primaryTypeLabel: string;
  isPaid: boolean;
  completedAt: string;
}

export type AgeGroup = 'newborn' | 'before_first' | 'after_first';

// API 함수
export function getQuestions(ageGroup: AgeGroup = 'after_first'): Promise<QuestionsResponse> {
  return fetchApi(`/api/temperament/questions?ageGroup=${ageGroup}`);
}

export function createSubmission(ageGroup: AgeGroup, childAge?: number) {
  return fetchApi<{ submissionId: string; startedAt: string }>(
    '/api/temperament/submissions',
    {
      method: 'POST',
      body: JSON.stringify({ childAge, ageGroup }),
    },
  );
}

export function submitAnswers(
  submissionId: string,
  answers: { questionId: string; questionNo: number; score: number }[],
) {
  return fetchApi<{ submissionId: string; status: string; resultId: string }>(
    `/api/temperament/submissions/${submissionId}/answers`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
  );
}

export function getResult(submissionId: string): Promise<TestResult> {
  return fetchApi(`/api/temperament/submissions/${submissionId}/result`);
}

export function unlockResult(submissionId: string, paymentId: string) {
  return fetchApi<{ resultId: string; isPaid: boolean; unlockedAt: string }>(
    `/api/temperament/submissions/${submissionId}/result/unlock`,
    {
      method: 'POST',
      body: JSON.stringify({ paymentId, paymentMethod: 'kakao_pay' }),
    },
  );
}

export interface PaymentItem {
  id: string;
  orderId: string;
  productType: string;
  productName: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUNDED';
  method?: string | null;
  receiptUrl?: string | null;
  cardCompany?: string | null;
  cardNumberMask?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export function getPayments(take = 50, skip = 0) {
  return fetchApi<{ items: PaymentItem[]; total: number; take: number; skip: number }>(
    `/api/payments?take=${take}&skip=${skip}`,
  );
}

export function getHistory(page = 1, limit = 10) {
  return fetchApi<{
    items: HistoryItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/temperament/history?page=${page}&limit=${limit}`);
}
