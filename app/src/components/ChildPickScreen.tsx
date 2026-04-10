'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Child } from '@/hooks/useChildren';
import { calcChildAge, toKstYmd } from '@/lib/childAge';

interface Props {
  emoji: string;
  title: string;
  description?: ReactNode;
  children: Child[];
  onSelect: (child: Child) => void;
}

export default function ChildPickScreen({
  emoji,
  title,
  description,
  children,
  onSelect,
}: Props) {
  return (
    <main className="flex flex-col items-center justify-center text-center min-h-[calc(100dvh-4rem)] gradient-page px-4 py-8">
      <span className="text-7xl mb-4">{emoji}</span>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      {description && (
        <p className="text-sm text-gray-400 leading-relaxed mb-6">{description}</p>
      )}
      <div className="w-full max-w-md flex flex-col gap-3">
        {children.map((child) => {
          const { days, months, extraDays } = calcChildAge(child.birthDate);
          const ageLabel = months > 0 ? `${months}개월 ${extraDays}일` : `${days}일`;
          const birthYmd = toKstYmd(child.birthDate);

          return (
            <button
              key={child.id}
              onClick={() => onSelect(child)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-primary-200 shadow-sm active:bg-gray-50 transition-colors text-left"
            >
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary-400 to-primary-300" />
                <div className="relative w-12 h-12 rounded-full bg-white overflow-hidden flex items-center justify-center text-2xl ring-2 ring-white leading-none">
                  {child.profileImage ? (
                    <Image src={child.profileImage} alt={child.name} fill className="object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full leading-[1]">{child.gender === 'female' ? '👧' : '👦'}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[17px] font-extrabold text-gray-900 truncate leading-tight">
                    {child.name}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full font-bold ${
                      child.gender === 'female'
                        ? 'bg-pink-100 text-pink-600'
                        : 'bg-sky-100 text-sky-600'
                    }`}
                    style={{ fontSize: '11px', lineHeight: 1, paddingBottom: '1.5px' }}
                  >
                    {child.gender === 'female' ? '♀' : '♂'}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">{birthYmd}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-full">
                    D+{days}
                  </span>
                  <span className="text-[11px] text-gray-600 font-medium">{ageLabel}</span>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-gray-300 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </main>
  );
}
