'use client';

import { useState } from 'react';
import { CATEGORY_TABS, type CategoryTabId } from './scene';
import Loading from '@/components/Loading';

/**
 * 꾸미기 모드 UI.
 *
 * 오른쪽 위 닫기(X)는 저장하지 않고 나가기, 왼쪽 위 저장 버튼이 방 배치를 반영한다.
 * 분류 탭은 가구를 옮길 때 방을 가리므로 접었다 펼 수 있다.
 */

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  /** 고른 탭. 편집 모드에 막 들어왔을 때는 없다. */
  activeTab: CategoryTabId | null;
  onPickTab: (tab: CategoryTabId) => void;
}

export default function EditChrome({ onClose, onSave, saving, activeTab, onPickTab }: Props) {
  const [tabsOpen, setTabsOpen] = useState(true);

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
          탭을 숨기면 "그런 분류가 없나?" 하고 헤매게 된다. 다만 가구를 옮길 땐 접어 둘 수 있다. */}
      <div
        className="absolute right-[20px] w-[66px] flex flex-col gap-[10px] items-end pointer-events-auto"
        style={{ top: 'calc(var(--safe-area-top) + 80px)' }}
      >
        <button
          type="button"
          onClick={() => setTabsOpen((v) => !v)}
          aria-expanded={tabsOpen}
          aria-label={tabsOpen ? '분류 접기' : '분류 펼치기'}
          className={`${BOX} w-full h-[50px] flex items-center justify-center active:translate-y-px`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tabsOpen ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
            alt=""
            width={24}
            height={24}
            className="block"
          />
        </button>

        {tabsOpen &&
          CATEGORY_TABS.map((c) => {
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

      {/* 저장 — X 와 같은 크기로 왼쪽 위에 둔다. 아이템 시트가 열려 있어도 가려지지 않는다. */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        aria-label="꾸민 방 저장하기"
        className={`${BOX} absolute left-[20px] size-[50px] flex items-center justify-center text-[#121212] text-[16px] leading-[1.4] pointer-events-auto active:translate-y-px disabled:opacity-60`}
        style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
      >
        {saving ? <Loading size={18} label="저장 중" /> : '저장'}
      </button>
    </div>
  );
}
