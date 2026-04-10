'use client';

import { useEffect, useRef, useState } from 'react';
import type { Child } from '@/hooks/useChildren';
import { calcChildAge } from '@/lib/childAge';

interface Props {
  children: Child[];
  selected: Child | null;
  onSelect: (child: Child) => void;
}

function formatBirth(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${y}. ${m}. ${d}`;
}

function Avatar({ child, size = 40 }: { child: Child; size?: number }) {
  const style = { width: size, height: size };
  if (child.profileImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={child.profileImage}
        alt={child.name}
        className="rounded-full object-cover bg-gray-200 shrink-0"
        style={style}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gray-100 shrink-0 flex items-center justify-center leading-[1]"
      style={{ ...style, fontSize: size * 0.55 }}
    >
      {child.gender === 'female' ? '👧' : '👦'}
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

  const { days, months, extraDays } = calcChildAge(selected.birthDate);

  return (
    <div className="relative" ref={ref}>
      {/* 선택된 아이 프로필 카드 — 풀 width */}
      <button
        type="button"
        onClick={() => children.length > 1 && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
      >
        <Avatar child={selected} size={44} />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-gray-900 truncate">{selected.name}</span>
            <span
              className={`inline-flex items-center justify-center w-[16px] h-[16px] rounded-full text-[10px] font-bold ${
                selected.gender === 'female'
                  ? 'bg-pink-100 text-pink-600'
                  : 'bg-sky-100 text-sky-600'
              }`}
              style={{ lineHeight: '16px', textAlign: 'center' }}
            >
              {selected.gender === 'female' ? '♀' : '♂'}
            </span>
            <span className="text-[11px] text-gray-400">{formatBirth(selected.birthDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded-full">
              D+{days}
            </span>
            <span className="text-[11px] text-gray-500">{months}개월 {extraDays}일</span>
          </div>
        </div>
        {children.length > 1 && (
          <svg
            className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
          {children.map((c) => {
            const isSelected = c.id === selected.id;
            const age = calcChildAge(c.birthDate);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-gray-50"
              >
                <Avatar child={c} size={38} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-sm truncate ${
                        isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {c.name}
                    </p>
                    <span
                      className={`inline-flex items-center justify-center w-[16px] h-[16px] rounded-full text-[10px] font-bold ${
                        c.gender === 'female'
                          ? 'bg-pink-100 text-pink-600'
                          : 'bg-sky-100 text-sky-600'
                      }`}
                      style={{ lineHeight: '16px', textAlign: 'center' }}
                    >
                      {c.gender === 'female' ? '♀' : '♂'}
                    </span>
                    <span className="text-[11px] text-gray-400">{formatBirth(c.birthDate)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    D+{age.days} · {age.months}개월 {age.extraDays}일
                  </p>
                </div>
                {isSelected && (
                  <svg
                    className="w-5 h-5 text-gray-900 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
