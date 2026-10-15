'use client';

import { CATEGORY_TABS, type CategoryTabId } from './scene';

/**
 * 꾸미기 모드 UI.
 *
 * 디자인에는 닫기(X)와 분류 탭만 있다. 저장 버튼이 따로 없으므로
 * X 가 "저장하고 끝내기"다 — 되돌리기는 각 아이템을 길게 눌러 치우는 쪽으로 푼다.
 */

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  onClose: () => void;
  saving: boolean;
  /** 고른 탭. 편집 모드에 막 들어왔을 때는 없다. */
  activeTab: CategoryTabId | null;
  onPickTab: (tab: CategoryTabId) => void;
}

export default function EditChrome({ onClose, saving, activeTab, onPickTab }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        aria-label="꾸미기 끝내기"
        className={`${BOX} absolute right-[20px] size-[50px] flex items-center justify-center pointer-events-auto active:translate-y-px disabled:opacity-60`}
        style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/close.svg" alt="" width={24} height={24} className="block" />
      </button>

      {/* 분류 탭 — 아이템이 없는 분류도 전부 띄운다.
          탭을 숨기면 "그런 분류가 없나?" 하고 헤매게 된다. */}
      <div
        className="absolute right-[20px] w-[66px] flex flex-col gap-[10px] items-end pointer-events-auto"
        style={{ top: 'calc(var(--safe-area-top) + 80px)' }}
      >
        {CATEGORY_TABS.map((c) => {
          const on = c.id === activeTab;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPickTab(c.id)}
              aria-pressed={on}
              className={`${BOX} w-full h-[50px] px-[16px] flex flex-col items-center justify-center text-[#121212] text-[16px] leading-[1.4] text-center active:translate-y-px`}
              // #FFD200 10% 를 흰 바탕 위에 겹쳐 불투명하게 칠한다. rgba 만 주면 뒤의 방이 비친다.
              style={on ? { background: 'linear-gradient(rgba(255,210,0,0.1), rgba(255,210,0,0.1)), #FDFDFE' } : undefined}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
