'use client';

import Image from 'next/image';
import { palette } from '@/lib/colors';

const TYPE_ICONS: Record<string, { src: string; alt: string }> = {
  explorer: { src: '/icon-temperament-explorer.svg', alt: '탐험가형 아이콘' },
  socializer: { src: '/icon-temperament-socializer.svg', alt: '사교가형 아이콘' },
  observer: { src: '/icon-temperament-observer.svg', alt: '관찰자형 아이콘' },
  concentrator: { src: '/icon-temperament-concentrator.svg', alt: '집중가형 아이콘' },
  balanced: { src: '/icon-temperament-balanced.svg', alt: '균형성장형 아이콘' },
};

interface ResultCoverProps {
  primaryType: string;
  primaryTypeLabel: string;
  title: string;
  description: string;
}

export default function ResultCover({
  primaryType,
  primaryTypeLabel,
  title,
  description,
}: ResultCoverProps) {
  const icon = TYPE_ICONS[primaryType] ?? TYPE_ICONS.balanced;

  return (
    <div className="flex flex-col gap-[10px]">
      <section
        className="bg-white rounded-lg p-6 flex flex-col items-center text-center"
        style={{ border: `1px solid ${palette.gray200}` }}
      >
        <div
          className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(48, 120, 201, 0.05)' }}
        >
          <Image
            src={icon.src}
            alt={icon.alt}
            width={56}
            height={56}
            priority
          />
        </div>
        <span className="inline-flex items-center h-6 px-2 rounded-lg text-[12px] font-medium text-white mb-4 bg-primary-500">
          {primaryTypeLabel}
        </span>
        <h2
          className="text-lg font-bold whitespace-pre-line"
          style={{ color: palette.black }}
        >
          {title.replace(/\\n/g, '\n')}
        </h2>
      </section>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: palette.gray100,
          border: `1px solid ${palette.gray200}`,
        }}
      >
        <p
          className="text-[14px] font-normal leading-relaxed text-left whitespace-pre-line"
          style={{ color: palette.gray500 }}
        >
          {description.replace(/\\n/g, '\n')}
        </p>
      </div>
    </div>
  );
}
