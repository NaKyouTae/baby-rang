'use client';

import Image from 'next/image';
import type { PaidContent } from '@/lib/api';
import { palette } from '@/lib/colors';
import ResultSection from './ResultSection';

interface PaidResultSectionProps {
  content: PaidContent;
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
      <ResultSection title="대표 유형 상세 설명" tone="subtle">
        <p className="text-[12px] font-normal text-app-black leading-relaxed">
          {content.typeDetail}
        </p>
      </ResultSection>

      <ResultSection title="6개 기질 상세 분석">
        <div className="space-y-5">
          {Object.entries(content.dimensionDetails).map(([key, detail]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-[10px]">
                <span className="text-[12px] font-medium text-app-black">
                  {DIMENSION_LABELS[key] || key}
                </span>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: palette.teal }}
                >
                  {detail.score}점
                </span>
              </div>
              <p className="text-[12px] font-normal text-app-black leading-relaxed mb-[10px]">
                {detail.description}
              </p>
              <div className="space-y-1">
                {detail.parentTips.map((tip, i) => (
                  <p
                    key={i}
                    className="text-[12px] font-normal rounded-[4px] px-3 py-2"
                    style={{
                      backgroundColor: 'rgba(48, 120, 201, 0.05)',
                      color: palette.teal,
                    }}
                  >
                    {tip}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="우리 아기의 핵심 강점">
        <div className="space-y-3">
          {content.strengths.map((s, i) => (
            <div key={i}>
              <p className="text-[12px] font-medium text-app-black mb-[10px]">
                {i + 1}. {s.title}
              </p>
              <div
                className="rounded-[4px] px-3 py-2"
                style={{ backgroundColor: 'rgba(81, 92, 102, 0.05)' }}
              >
                <p
                  className="text-[12px] font-normal leading-relaxed"
                  style={{ color: palette.gray600 }}
                >
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="부모가 놓치기 쉬운 주의 포인트">
        <div className="space-y-3">
          {content.cautions.map((c, i) => (
            <div key={i}>
              <p className="text-[12px] font-medium text-app-black mb-[10px]">
                {i + 1}. {c.title}
              </p>
              <div
                className="rounded-[4px] px-3 py-2"
                style={{ backgroundColor: 'rgba(81, 92, 102, 0.05)' }}
              >
                <p
                  className="text-[12px] font-normal leading-relaxed"
                  style={{ color: palette.gray600 }}
                >
                  {c.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="감정이 올라올 때 이렇게 도와주세요">
        <div className="space-y-3">
          {content.emotionCoaching.tips.map((tip, i) => (
            <div key={i}>
              <p className="text-[12px] font-medium text-app-black mb-[10px]">
                {tip.action}
              </p>
              <div
                className="rounded-[4px] px-3 py-2"
                style={{ backgroundColor: 'rgba(48, 120, 201, 0.05)' }}
              >
                <p
                  className="text-[12px] font-normal leading-relaxed"
                  style={{ color: palette.teal }}
                >
                  {tip.example}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="학습 스타일 제안">
        <div>
          <div className="flex items-center gap-2 mb-[10px]">
            <Image
              src="/ic-check.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
              aria-hidden
            />
            <span className="text-[12px] font-medium text-app-black">
              잘 맞을 수 있는 방식
            </span>
          </div>
          <div className="space-y-1">
            {content.learningStyle.recommended.map((r, i) => (
              <p
                key={i}
                className="text-[12px] font-normal rounded-[4px] px-3 py-2"
                style={{
                  backgroundColor: 'rgba(48, 120, 201, 0.05)',
                  color: palette.teal,
                }}
              >
                {r}
              </p>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-[10px]">
            <Image
              src="/ic-x.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
              aria-hidden
            />
            <span className="text-[12px] font-medium text-app-black">
              힘들 수 있는 방식
            </span>
          </div>
          <div className="space-y-1">
            {content.learningStyle.difficult.map((d, i) => (
              <p
                key={i}
                className="text-[12px] font-normal rounded-[4px] px-3 py-2"
                style={{
                  backgroundColor: 'rgba(255, 59, 48, 0.05)',
                  color: palette.red,
                }}
              >
                {d}
              </p>
            ))}
          </div>
        </div>
      </ResultSection>

      <ResultSection title="친구 관계 가이드">
        <div className="space-y-2">
          {content.socialGuide.patterns.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <Image
                src="/ic-check.svg"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <p className="text-[12px] font-normal text-app-black">{p}</p>
            </div>
          ))}
        </div>
        <div
          className="mt-4 rounded-[4px] p-3"
          style={{ backgroundColor: 'rgba(255, 204, 0, 0.05)' }}
        >
          <p className="text-[12px] font-semibold text-app-black mb-2">
            부모 TIP
          </p>
          <div className="space-y-1">
            {content.socialGuide.parentTips.map((t, i) => (
              <p
                key={i}
                className="text-[12px] font-normal text-app-black"
              >
                {t}
              </p>
            ))}
          </div>
        </div>
      </ResultSection>

      <ResultSection title="생활 루틴 가이드">
        <div className="grid grid-cols-2 gap-2">
          {content.routineGuide.map((r, i) => (
            <div
              key={i}
              className="rounded-[8px] py-3 px-2 text-center"
              style={{ backgroundColor: palette.gray100 }}
            >
              <span
                className="text-[12px] font-normal"
                style={{ color: palette.gray600 }}
              >
                {r}
              </span>
            </div>
          ))}
        </div>
      </ResultSection>

      {content.combinationInsight && (
        <ResultSection title="기질 조합 해석">
          <div className="flex items-center gap-2 mb-[10px]">
            <Image
              src="/ic-check.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
              aria-hidden
            />
            <span className="text-[12px] font-medium text-app-black">
              {content.combinationInsight.label}
            </span>
          </div>
          <div
            className="rounded-[4px] px-3 py-2"
            style={{ backgroundColor: 'rgba(48, 120, 201, 0.05)' }}
          >
            <p
              className="text-[12px] font-normal leading-relaxed"
              style={{ color: palette.teal }}
            >
              {content.combinationInsight.description}
            </p>
          </div>
        </ResultSection>
      )}

      <ResultSection title="부모를 위한 한 줄 제안">
        <div className="space-y-2">
          {content.parentAdvice.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <Image
                src="/ic-check.svg"
                alt=""
                width={16}
                height={16}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <p className="text-[12px] font-normal text-app-black">{a}</p>
            </div>
          ))}
        </div>
      </ResultSection>

      <div
        className="mt-6 rounded-lg p-4"
        style={{ backgroundColor: palette.gray100 }}
      >
        <p
          className="text-[14px] font-normal leading-relaxed"
          style={{ color: palette.gray500 }}
        >
          {content.closingMessage}
        </p>
      </div>
    </div>
  );
}
