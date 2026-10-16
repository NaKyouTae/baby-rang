'use client';

import { CATEGORY_TABS, type CategoryTabId } from './scene';
import Loading from '@/components/Loading';

/**
 * 꾸미기 모드 UI.
 *
 * 오른쪽 위 닫기(X)는 저장하지 않고 나가기, 그 아래 저장 버튼이 방 배치를 반영한다.
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

      {/* 저장과 분류 탭 — 아이템이 없는 분류도 전부 띄운다. */}
      <div
        className="absolute right-[20px] w-[66px] flex flex-col gap-[10px] items-end pointer-events-auto"
        style={{ top: 'calc(var(--safe-area-top) + 80px)' }}
      >
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="꾸민 방 저장하기"
          className="w-full h-[40px] flex items-center justify-center rounded-[4px] border border-[#121212] bg-[#3078C9] text-white text-[16px] leading-[1.4] active:translate-y-px disabled:opacity-60"
        >
          {saving ? <Loading size={18} label="저장 중" /> : '저장'}
        </button>

        {CATEGORY_TABS.map((c) => {
          const on = c.id === activeTab;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPickTab(c.id)}
              aria-pressed={on}
              className={`${BOX} w-full h-[40px] px-[16px] flex flex-col items-center justify-center text-[#121212] text-[16px] leading-[1.4] text-center active:translate-y-px`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
