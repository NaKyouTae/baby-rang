'use client';

import { useEffect, useRef, useState } from 'react';
import type { Child } from '@/hooks/useChildren';
import { calcChildAge } from '@/lib/childAge';

interface Props {
  children: Child[];
  selected: Child | null;
  onSelect: (child: Child) => void;
}

function ChildInfo({ child }: { child: Child }) {
  const { days, months, extraDays } = calcChildAge(child.birthDate);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-[16px] font-medium text-black truncate">{child.name}</span>
      <span className="text-[12px] font-medium text-white bg-[#3078C9] px-1 py-0.5 rounded-[2px] leading-none">
        D+{days}
      </span>
      <span className="text-[12px] font-normal text-black">{months}개월 {extraDays}일</span>
    </div>
  );
}

export default function ChildSelector({ children, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!selected) return null;

  return (
    <div className="relative" ref={ref}>
      {/* 선택된 아기 프로필 카드 — 풀 width, 중앙 정렬 */}
      <button
        type="button"
        onClick={() => children.length > 1 && setOpen((v) => !v)}
        className="w-full relative flex items-center justify-center h-10 bg-gray-100 rounded-lg px-10 border border-gray-200 active:bg-gray-200 transition-colors"
      >
        <ChildInfo child={selected} />
        {children.length > 1 && (
          <svg
            className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* 드롭다운 — 선택 카드와 8px 간격 */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
          {children.map((c) => {
            const isSelected = c.id === selected.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-center h-10 px-10 transition-colors ${
                  isSelected ? 'bg-gray-200' : 'bg-white active:bg-gray-100'
                }`}
              >
                <ChildInfo child={c} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
