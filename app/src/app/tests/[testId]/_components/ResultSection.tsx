'use client';

import type { ReactNode } from 'react';
import { palette } from '@/lib/colors';

type ResultSectionTone = 'default' | 'subtle';

interface ResultSectionProps {
  title: string;
  children: ReactNode;
  tone?: ResultSectionTone;
}

export default function ResultSection({
  title,
  children,
  tone = 'default',
}: ResultSectionProps) {
  const backgroundColor = tone === 'subtle' ? palette.gray100 : '#fff';

  return (
    <section className="mt-6">
      <h3
        className="text-[14px] font-semibold mb-[10px]"
        style={{ color: palette.black }}
      >
        {title}
      </h3>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor,
          border: `1px solid ${palette.gray200}`,
        }}
      >
        {children}
      </div>
    </section>
  );
}
