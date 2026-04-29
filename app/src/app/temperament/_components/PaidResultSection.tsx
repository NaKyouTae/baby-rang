'use client';

import type { PaidContent } from '@/lib/api';

interface PaidResultSectionProps {
  content: PaidContent;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

const DIMENSION_LABELS: Record<string, string> = {
  activity: '활동성',
  adaptability: '적응성',
  emotional_intensity: '감정 표현 강도',
  sociability: '사회성',
  persistence: '집중 지속성',
  sensitivity: '민감성',
};

export default function PaidResultSection({ content }: PaidResultSectionProps) {
  return (
    <div className="pb-8">
      <Card title="대표 유형 상세 설명">
        <p className="text-sm text-gray-600 leading-relaxed">
          {content.typeDetail}
        </p>
      </Card>

      <Card title="6개 기질 상세 분석">
        <div className="space-y-5">
          {Object.entries(content.dimensionDetails).map(([key, detail]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-gray-800">
                  {DIMENSION_LABELS[key] || key}
                </span>
                <span className="text-xs text-primary-500 font-medium">
                  {detail.score}점
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                {detail.description}
              </p>
              {detail.parentTips.map((tip, i) => (
                <p key={i} className="text-xs text-primary-700 bg-primary-50 rounded-lg px-3 py-2 mb-1">
                  {tip}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card title="우리 아기의 핵심 강점">
        <div className="space-y-3">
          {content.strengths.map((s, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-800">{s.title}</p>
              <p className="text-sm text-gray-500">{s.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="부모가 놓치기 쉬운 주의 포인트">
        <div className="space-y-3">
          {content.cautions.map((c, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-800">{c.title}</p>
              <p className="text-sm text-gray-500">{c.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title={content.emotionCoaching.title}>
        <div className="space-y-3">
          {content.emotionCoaching.tips.map((tip, i) => (
            <div key={i} className="bg-primary-50/50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-800 mb-1">
                {tip.action}
              </p>
              <p className="text-xs text-gray-500 italic">
                예: &ldquo;{tip.example}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="학습 스타일 제안">
        <div className="mb-3">
          <p className="text-xs font-semibold text-emerald-600 mb-2">
            잘 맞을 수 있는 방식
          </p>
          <ul className="space-y-1">
            {content.learningStyle.recommended.map((r, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">&#10003;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2">
            힘들 수 있는 방식
          </p>
          <ul className="space-y-1">
            {content.learningStyle.difficult.map((d, i) => (
              <li key={i} className="text-sm text-gray-500 flex items-start gap-1.5">
                <span className="text-red-300 mt-0.5">&#10005;</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card title="친구 관계 가이드">
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            관계에서 보일 수 있는 모습
          </p>
          <ul className="space-y-1">
            {content.socialGuide.patterns.map((p, i) => (
              <li key={i} className="text-sm text-gray-600">
                &bull; {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-primary-500 mb-2">부모 도움 팁</p>
          {content.socialGuide.parentTips.map((t, i) => (
            <p key={i} className="text-xs text-primary-700 bg-primary-50 rounded-lg px-3 py-2 mb-1">
              {t}
            </p>
          ))}
        </div>
      </Card>

      <Card title="생활 루틴 가이드">
        <ul className="space-y-1.5">
          {content.routineGuide.map((r, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
              <span className="text-primary-400 mt-0.5">&#10003;</span>
              {r}
            </li>
          ))}
        </ul>
      </Card>

      {content.combinationInsight && (
        <Card title="기질 조합 해석">
          <div className="bg-gradient-to-br from-primary-50 to-pink-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-primary-700 mb-2">
              {content.combinationInsight.label}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {content.combinationInsight.description}
            </p>
          </div>
        </Card>
      )}

      <Card title="부모를 위한 한 줄 제안">
        <div className="space-y-2">
          {content.parentAdvice.map((a, i) => (
            <p
              key={i}
              className="text-sm text-gray-700 bg-amber-50 rounded-xl px-4 py-3"
            >
              {a}
            </p>
          ))}
        </div>
      </Card>

      <div className="mt-8">
        <div className="bg-gradient-to-br from-primary-50 to-amber-50 rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-gray-800 leading-relaxed">
            &ldquo;{content.closingMessage}&rdquo;
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <a
          href="/temperament"
          className="inline-block w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
        >
          기질 검사 다시 하러가기
        </a>
      </div>
    </div>
  );
}
