'use client';

import Image from 'next/image';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';
import { palette } from '@/lib/colors';

type TestItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  linkUrl: string;
  labels: string[];
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  questionCount: number | null;
};

const formatDuration = (
  min: number | null,
  max: number | null,
): string | null => {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}~${max}분`;
  return `${min ?? max}분`;
};

export default function TestsClient({ tests }: { tests: TestItem[] }) {
  return (
    <div className="flex flex-col bg-white min-h-screen-safe">
      <PageHeader title="테스트" variant="back" />

      <main className="flex-1 flex flex-col px-5 pt-6 pb-28">
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 text-sm">
            <span className="text-3xl mb-2">📝</span>
            등록된 테스트가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-gray-200">
            {tests.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tests/${t.id}`}
                  className="flex items-center gap-4 py-4 active:bg-gray-50 transition-colors"
                >
                  <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative flex items-center justify-center">
                    {t.thumbnailUrl ? (
                      <Image
                        src={t.thumbnailUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-2xl">📝</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    <div>
                      <h2
                        className="text-[14px] font-semibold leading-tight"
                        style={{ color: palette.black }}
                      >
                        {t.title}
                      </h2>
                      {t.description && (
                        <p
                          className="mt-1 text-[12px] font-normal leading-snug whitespace-pre-line line-clamp-2"
                          style={{ color: palette.gray500 }}
                        >
                          {t.description.replace(/\\n/g, '\n')}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const duration = formatDuration(
                        t.durationMinMinutes,
                        t.durationMaxMinutes,
                      );
                      const hasMeta =
                        duration != null ||
                        t.questionCount != null ||
                        t.labels.length > 0;
                      if (!hasMeta) return null;
                      return (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {duration != null && (
                          <span
                            className="inline-flex items-center gap-1 text-[12px] font-medium leading-none"
                            style={{ color: palette.gray500 }}
                          >
                            <Image
                              src="/icon-test-time.svg"
                              alt=""
                              width={14}
                              height={14}
                              aria-hidden
                            />
                            {duration}
                          </span>
                        )}
                        {t.questionCount != null && (
                          <span
                            className="inline-flex items-center gap-1 text-[12px] font-medium leading-none"
                            style={{ color: palette.gray500 }}
                          >
                            <Image
                              src="/icon-test-write.svg"
                              alt=""
                              width={14}
                              height={14}
                              aria-hidden
                            />
                            {t.questionCount}문항
                          </span>
                        )}
                        {t.labels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-1 py-0.5 text-[12px] font-medium leading-none rounded-[2px]"
                            style={{
                              backgroundColor: 'rgba(0, 122, 255, 0.15)',
                              color: palette.teal,
                            }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      );
                    })()}
                  </div>

                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    stroke={palette.black}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-6 -mx-5 flex justify-center">
          <KakaoAdBanner unit="DAN-gFh4OIyY7XHzHJyP" />
        </div>
      </main>
    </div>
  );
}
