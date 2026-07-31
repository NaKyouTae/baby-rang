'use client';

import Image from 'next/image';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
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

export default function TestsClient({ tests }: { tests: TestItem[] }) {
  return (
    <div className="flex flex-col bg-white min-h-screen-safe">
      <PageHeader title="테스트" variant="back" />

      <main className="flex-1 flex flex-col px-5 pt-6 pb-28">
        <div
          className="mb-4 rounded-lg px-3.5 py-3 text-[12px] leading-snug"
          style={{
            backgroundColor: 'rgba(255, 149, 0, 0.12)',
            color: palette.gray500,
          }}
        >
          <span className="font-semibold" style={{ color: palette.black }}>
            개발 중인 서비스입니다.
          </span>{' '}
          현재 테스트 기능은 개발 중이며, 실제 결제는 이루어지지 않습니다.
        </div>

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
                    {t.labels.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                    )}
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

      </main>
    </div>
  );
}
