'use client';

import { useEffect, useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';

export type RoomItem = {
  id: string;
  spriteKey: string;
  name: string;
  category: string;
  surface: string;
  tileW: number;
  tileH: number;
  spriteLiftY: number;
  imageUrl: string | null;
  unlock: string;
  priceCoins: number | null;
};

/** 어드민의 분류와 짝이 맞아야 한다. 탭 순서는 꾸밀 때 손이 가는 순서로 둔다. */
const CATEGORIES: { id: string; label: string }[] = [
  { id: 'FURNITURE', label: '가구' },
  { id: 'DECOR', label: '소품' },
  { id: 'RUG', label: '러그' },
  { id: 'TOY', label: '장난감' },
  { id: 'WINDOW', label: '창문' },
  { id: 'WALLPAPER', label: '벽지' },
  { id: 'FLOORING', label: '바닥재' },
];

const UNLOCK_LABEL: Record<string, string> = {
  FREE: '보유',
  REWARD: '기록 보상',
  PURCHASE: '구매',
  EVENT: '이벤트',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: RoomItem) => void;
}

export default function DecorateSheet({ open, onClose, onPick }: Props) {
  const [items, setItems] = useState<RoomItem[] | null>(null);
  const [tab, setTab] = useState<string>(CATEGORIES[0].id);

  // 시트를 열 때만 불러온다. 카탈로그는 자주 바뀌지 않으니 한 번 받으면 들고 있는다.
  useEffect(() => {
    if (!open || items !== null) return;
    let alive = true;
    fetch('/api/room-items')
      .then((r) => r.json())
      .then((d) => alive && setItems(d.items ?? []))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [open, items]);

  // 아이템이 하나도 없는 분류는 탭에서 뺀다. 빈 탭을 누르게 하면 고장처럼 보인다.
  const tabs = useMemo(() => {
    if (!items) return CATEGORIES;
    const filled = CATEGORIES.filter((c) => items.some((i) => i.category === c.id));
    return filled.length ? filled : CATEGORIES.slice(0, 1);
  }, [items]);

  // 고른 탭이 목록에서 사라졌으면(아이템이 하나도 없는 분류) 첫 탭을 보여준다
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const visible = items?.filter((i) => i.category === activeTab) ?? [];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      variant="sheet"
      maxHeight="72vh"
      ariaLabel="방 꾸미기"
      surfaceClassName="bg-[#FFFBEF] border-t-2 border-[#7A5A36]"
    >
      <div className="flex flex-col min-h-0" style={{ fontFamily: 'Galmuri11, monospace' }}>
        <div className="px-4 pt-3 shrink-0">
          <div className="w-10 h-1 bg-[#7A5A36] mx-auto mb-3" />
          <h2 className="text-[16px] text-[#4A3B2C]">방 꾸미기</h2>
          <p className="mt-1 text-[11px]" style={{ color: '#A8926F' }}>
            어드민에 등록된 아이템입니다. 고르면 방에 놓입니다.
          </p>
        </div>

        {/* 분류 탭 — 가로 스크롤. 분류가 늘어나도 줄바꿈으로 높이가 튀지 않는다. */}
        <div className="shrink-0 mt-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-1.5 w-max">
            {tabs.map((c) => {
              const on = c.id === activeTab;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTab(c.id)}
                  className="h-8 px-3 text-[12px] border-2 shrink-0"
                  style={
                    on
                      ? { background: '#7A5A36', borderColor: '#4A3B2C', color: '#FFFBEF' }
                      : { background: '#FFFDF8', borderColor: '#C2A67C', color: '#7A5A36' }
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(var(--safe-area-bottom),16px)]">
          {items === null && (
            <p className="py-10 text-center text-[12px] text-[#A8926F]" style={{ color: '#A8926F' }}>
              불러오는 중
            </p>
          )}

          {items !== null && visible.length === 0 && (
            <p className="py-10 text-center text-[12px]" style={{ color: '#A8926F' }}>
              이 분류에 아직 아이템이 없습니다
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item)}
                className="flex flex-col items-center gap-1 p-2 border-2 active:translate-y-px"
                style={{ background: '#FFFDF8', borderColor: '#C2A67C' }}
              >
                <span
                  className="w-full flex items-center justify-center"
                  style={{ height: 56, background: '#F2E6CE' }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="max-w-full max-h-full"
                      // 픽셀 아트라 보간하면 뭉개진다
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-[10px]" style={{ color: '#A8926F' }}>
                      그림 없음
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-tight text-center" style={{ color: '#4A3B2C' }}>
                  {item.name}
                </span>
                <span className="text-[10px]" style={{ color: '#A8926F' }}>
                  {item.tileW}×{item.tileH}칸 · {UNLOCK_LABEL[item.unlock] ?? item.unlock}
                  {item.priceCoins != null && ` ${item.priceCoins}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
