'use client';

import { useEffect, useState } from 'react';
import { ALL_TYPES, GrowthType, TYPE_CONFIG } from './types';

interface Props {
  current: GrowthType[];
  onClose: () => void;
  onSaved: (next: GrowthType[]) => void;
}

export default function QuickButtonSettings({ current, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<GrowthType[]>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  function toggle(t: GrowthType) {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/growth-quick-buttons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: selected }),
      });
      if (res.ok) {
        const json = await res.json();
        onSaved(json.types);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col pb-[var(--safe-area-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">간편 버튼 설정</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <p className="px-5 pt-3 pb-3 text-xs text-gray-500">
          타임라인 하단에 노출할 항목을 선택하세요.
        </p>
        <div className="overflow-y-auto px-5 py-3 flex flex-col gap-2">
          {ALL_TYPES.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const on = selected.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${
                  on
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-100 bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-2xl">{cfg.emoji}</span>
                <span className="text-sm font-medium flex-1 text-left">{cfg.label}</span>
                {on && (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
