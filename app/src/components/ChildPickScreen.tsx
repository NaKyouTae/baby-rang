'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { GENDER_LABEL, type Child } from '@/hooks/useChildren';
import { formatChildAge } from '@/lib/childAge';

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
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => onSelect(child)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm active:bg-gray-50 transition-colors text-left"
          >
            <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center">
              {child.profileImage ? (
                <Image src={child.profileImage} alt={child.name} fill className="object-cover" />
              ) : (
                <span className="text-xl">{child.gender === 'male' ? '👦' : '👧'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 truncate">{child.name}</p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    child.gender === 'male'
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-pink-50 text-pink-500'
                  }`}
                >
                  {GENDER_LABEL[child.gender as 'male' | 'female']}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {child.birthDate?.slice(0, 10).replace(/-/g, '. ')}
              </p>
              <p className="text-xs text-gray-400">
                {formatChildAge(child.birthDate)}
              </p>
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
        ))}
      </div>
    </main>
  );
}
