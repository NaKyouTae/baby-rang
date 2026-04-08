'use client';

import { useEffect, useRef, useState } from 'react';
import type { Child } from '@/hooks/useChildren';
import { formatChildAge } from '@/lib/childAge';

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

const formatAge = (date: string) => formatChildAge(date);

function Avatar({ child, size = 32 }: { child: Child; size?: number }) {
  const cls = 'rounded-full object-cover bg-gray-200 shrink-0';
  const style = { width: size, height: size };
  if (child.profileImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={child.profileImage} alt={child.name} className={cls} style={style} />;
  }
  return (
    <div
      className={`${cls} flex items-center justify-center text-gray-500 font-semibold`}
      style={{ ...style, fontSize: size * 0.4 }}
    >
      {child.name?.[0] ?? '?'}
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white px-2 py-1 rounded-full shadow-sm active:bg-gray-50"
      >
        <Avatar child={selected} size={36} />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-gray-900">{selected.name}</span>
          {formatAge(selected.birthDate) && (
            <span className="text-[10px] text-gray-400">{formatAge(selected.birthDate)}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
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
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl active:bg-gray-50 hover:bg-gray-50"
              >
                <Avatar child={c} size={44} />
                <div className="flex-1 min-w-0 text-left">
                  <p
                    className={`text-sm truncate ${
                      isSelected ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatBirth(c.birthDate)}</p>
                  {formatAge(c.birthDate) && (
                    <p className="text-xs text-gray-400">{formatAge(c.birthDate)}</p>
                  )}
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
