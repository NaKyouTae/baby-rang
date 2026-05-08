'use client';

import Image from 'next/image';
import { type ReactNode } from 'react';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';
import type { TestInfo } from './types';

type Props = {
  test: TestInfo;
  middleSlot?: ReactNode;
  bottomSlot: ReactNode;
  iconSrc?: string;
  disclaimer?: string;
};

export default function TestStartShell({
  test,
  middleSlot,
  bottomSlot,
  iconSrc = '/icon-baby-crying.svg',
  disclaimer = '해당 테스트는 의학적 진단이 아닌 기질 이해용 참고 자료입니다.',
}: Props) {
  const description = (test.description ?? '').replace(/\\n/g, '\n');
  const hasQ = test.questionCount != null;
  const durationLabel =
    test.durationMinMinutes != null && test.durationMaxMinutes != null
      ? test.durationMinMinutes === test.durationMaxMinutes
        ? `약 ${test.durationMinMinutes}분`
        : `약 ${test.durationMinMinutes}~${test.durationMaxMinutes}분`
      : test.durationMinMinutes != null
      ? `약 ${test.durationMinMinutes}분`
      : test.durationMaxMinutes != null
      ? `약 ${test.durationMaxMinutes}분`
      : null;
  const hasD = durationLabel != null;
  const hasMeta = hasQ || hasD;

  return (
    <>
      <PageHeader title="테스트" variant="back" />
      <main className="flex flex-col items-center text-center px-5 pb-[168px]">
        <div
          className="mt-[136px] mb-6 flex items-center justify-center w-[100px] h-[100px] rounded-full"
          style={{ backgroundColor: 'rgba(48, 120, 201, 0.05)' }}
        >
          <Image src={iconSrc} alt="" width={56} height={56} priority />
        </div>

        {test.title && (
          <h1
            className="text-base font-semibold leading-tight mb-2.5"
            style={{ color: palette.black }}
          >
            {test.title}
          </h1>
        )}

        {description && (
          <p
            className="text-sm font-normal leading-relaxed whitespace-pre-line mb-6"
            style={{ color: palette.gray500 }}
          >
            {description}
          </p>
        )}

        {hasMeta && (
          <div
            className="flex items-center text-xs font-normal mb-6"
            style={{ color: palette.gray500 }}
          >
            {hasQ && (
              <span className="inline-flex items-center gap-1">
                <Image
                  src="/icon-test-write.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden
                />
                {test.questionCount}문항
              </span>
            )}
            {hasQ && hasD && (
              <span
                aria-hidden
                className="mx-2.5 w-px h-2"
                style={{ backgroundColor: palette.gray300 }}
              />
            )}
            {hasD && (
              <span className="inline-flex items-center gap-1">
                <Image
                  src="/icon-test-time.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden
                />
                {durationLabel}
              </span>
            )}
          </div>
        )}

        <p
          className="text-[10px] font-normal leading-relaxed text-center mb-6"
          style={{ color: palette.gray400 }}
        >
          {disclaimer}
        </p>

        {middleSlot && <div className="w-full max-w-xs mb-5">{middleSlot}</div>}
      </main>

      {/* Bottom CTA: 하단 네비(64px + 24px 마진) 위 24px 간격 */}
      <div className="fixed bottom-[112px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-40 pointer-events-none">
        <div className="pointer-events-auto">{bottomSlot}</div>
      </div>
    </>
  );
}
