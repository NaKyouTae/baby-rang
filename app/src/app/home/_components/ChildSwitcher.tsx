'use client';

import { useState } from 'react';

/**
 * 아기방 상단의 아이 정보 카드.
 *
 * 생일이 같은 아이들은 쌍둥이로 보고 한 카드에 이름을 나란히 띄운다.
 * 고를 묶음이 둘 이상일 때만 화살표를 달고, 누르면 카드 아래에 목록이 펼쳐진다.
 */

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

export type Kid = { name: string; gender?: string };

/** 목록 한 줄 — 아이 한 명이거나 쌍둥이 한 묶음. */
export type KidGroup = { key: string; kids: Kid[] };

interface Props {
  /** 지금 카드에 띄우는 묶음 */
  current: KidGroup;
  /** 고를 수 있는 묶음 전부. 하나뿐이면 목록을 열지 않는다. */
  groups: KidGroup[];
  /** "D+123", "3개월 1일" 처럼 점으로 나눠 띄울 나이 조각 */
  ageParts: string[];
  onSelect: (key: string) => void;
  /** 주면 카드 전체가 이 버튼이 된다(목록을 열지 않는다). 로그인 전 미리보기에서 로그인으로 보낼 때 쓴다. */
  onTap?: () => void;
}

export default function ChildSwitcher({ current, groups, ageParts, onSelect, onTap }: Props) {
  const [open, setOpen] = useState(false);
  const switchable = !onTap && groups.length > 1;

  const body = (
    <>
      <div className="flex-1 min-w-0 flex flex-col items-start leading-[1.4] whitespace-nowrap">
        <div className="max-w-full flex gap-[10px] items-start text-[14px] overflow-hidden">
          {current.kids.map((k) => (
            <span key={k.name} className="flex gap-[4px] items-start min-w-0">
              <span className="text-[#121212] truncate">{k.name}</span>
              {k.gender === 'male' && <span className="text-[#0078F0] shrink-0">♂</span>}
              {k.gender === 'female' && <span className="text-[#FF4040] shrink-0">♀</span>}
            </span>
          ))}
        </div>
        <div className="w-full flex gap-[10px] items-center text-[#121212] text-[12px]">
          {ageParts.map((p, i) => (
            <span key={i} className="flex gap-[10px] items-center shrink-0">
              {i > 0 && <span aria-hidden>･</span>}
              <span>{p}</span>
            </span>
          ))}
        </div>
      </div>
      {switchable && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={open ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
          alt=""
          width={24}
          height={24}
          className="block shrink-0"
        />
      )}
    </>
  );

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label="로그인하고 아이 등록하기"
        className={`${BOX} flex-1 min-w-0 h-[48px] flex items-center px-[10px] text-left active:translate-y-px`}
      >
        {body}
      </button>
    );
  }

  if (!switchable) {
    return <div className={`${BOX} flex-1 min-w-0 h-[48px] flex items-center px-[10px]`}>{body}</div>;
  }

  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="아이 바꾸기"
        className={`${BOX} w-full h-[48px] flex items-center px-[10px] text-left`}
      >
        {body}
      </button>

      {open && (
        <>
          {/* 바깥을 누르면 닫는다 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            aria-label="아이 목록"
            className={`${BOX} absolute left-0 right-0 top-[58px] z-20 max-h-[120px] overflow-y-auto overflow-x-hidden flex flex-col`}
          >
            {groups.map((g, i) => {
              const on = g.key === current.key;
              return (
                <li key={g.key} role="option" aria-selected={on} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (!on) onSelect(g.key);
                    }}
                    // 바깥 테두리는 목록 상자가 그린다. 줄 사이에만 선을 넣어야 겹치지 않는다.
                    className={`w-full flex items-center px-[10px] py-[6px] text-[16px] leading-[1.4] text-[#121212] text-left ${
                      i > 0 ? 'border-t border-[#121212]' : ''
                    }`}
                    style={{ background: on ? 'rgba(255,210,0,0.1)' : undefined }}
                  >
                    <span className="truncate">{g.kids.map((k) => k.name).join(', ')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
