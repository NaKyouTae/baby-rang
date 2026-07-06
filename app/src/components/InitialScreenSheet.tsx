'use client';

import { useEffect, useState, type ReactNode } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { HomeNavIcon } from '@/components/nav-icons';
import { INITIAL_SCREEN_MENUS, MENU_CATALOG } from '@/components/menuCatalog';
import { palette } from '@/lib/colors';

// 세션당 초기화면 리다이렉트가 1회 동작하도록 플래그를 쓰는데,
// 설정을 바꾸면 다음 진입에서 새 설정을 반영해야 하므로 저장 시 플래그를 지운다.
const REDIRECT_FLAG = 'initial_screen_redirected';

type Target = 'home' | (typeof INITIAL_SCREEN_MENUS)[number];

type Option = { id: Target; label: string; icon: (selected: boolean) => ReactNode };

const OPTIONS: Option[] = [
  { id: 'home', label: '홈', icon: (selected) => <HomeNavIcon active={selected} /> },
  ...INITIAL_SCREEN_MENUS.map((id) => ({
    id: id as Target,
    label: MENU_CATALOG[id].label,
    icon: (selected: boolean) =>
      MENU_CATALOG[id].icon(selected, selected ? palette.teal : palette.black),
  })),
];

function OptionGrid({
  value,
  onChange,
}: {
  value: Target;
  onChange: (v: Target) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={selected}
            className={`flex flex-col items-center justify-center gap-1.5 h-[64px] rounded-[8px] border transition ${
              selected
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            {opt.icon(selected)}
            <span
              className={`text-[11px] font-medium ${
                selected ? 'text-primary-500' : 'text-black'
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function InitialScreenSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: (home: string) => void;
}) {
  const [home, setHome] = useState<Target>('home');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/screen-preference', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { home?: string };
          if (!cancelled) setHome((data.home as Target) ?? 'home');
        }
      } catch {
        /* 기본값(홈) 유지 */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/screen-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home }),
      });
      if (!res.ok) {
        alert('저장 중 오류가 발생했어요.\n잠시 후 다시 시도해주세요.');
        setSaving(false);
        return;
      }
      // 다음 진입 시 새 설정이 반영되도록 세션 리다이렉트 플래그 초기화.
      try {
        sessionStorage.removeItem(REDIRECT_FLAG);
      } catch {
        /* noop */
      }
      onSaved?.(home);
      onClose();
    } catch {
      alert('저장 중 오류가 발생했어요.\n잠시 후 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} zIndex={80} variant="sheet" ariaLabel="초기 화면 설정">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-base font-medium text-app-black">초기 화면 설정</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
          aria-label="닫기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-2 space-y-4">
        <p className="text-[12px] font-normal" style={{ color: palette.gray500 }}>
          앱과 웹에 처음 들어왔을 때 보여줄 화면을 선택할 수 있어요.
        </p>

        <OptionGrid value={home} onChange={setHome} />
      </div>

      <div
        className="px-4 pt-4 flex gap-[10px]"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-12 rounded-[4px] bg-gray-200 text-gray-600 text-sm font-semibold active:bg-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!loaded || saving}
          className="flex-1 h-12 rounded-[4px] bg-primary-500 text-white text-sm font-semibold active:bg-primary-600 disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </BottomSheet>
  );
}
