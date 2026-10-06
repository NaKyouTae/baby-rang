'use client';

import { useEffect, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { CATEGORY_TABS, type CategoryTabId } from './scene';
import { GemIcon } from './icons';
import ConfirmModal, { PriceTitle } from './ConfirmModal';
import MenuPicker from './MenuPicker';
import { loadRoomItems } from './roomItems';
import type { ActionId } from './RoomChrome';

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

/** 아이템을 고르는 탭만. '메뉴' 탭은 기록 버튼을 고르는 거라 분류가 비어 있다. */
const ITEM_TABS = CATEGORY_TABS.filter((c) => c.categories.length > 0);

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: RoomItem) => void;
  category: CategoryTabId;
  onChangeCategory: (category: CategoryTabId) => void;
  /** 저장하기 — 방 배치를 서버에 반영한다. */
  onSave: () => void;
  saving: boolean;
  /** 보유 중인 아이템 id. 무료 아이템은 여기 없어도 보유로 본다. */
  ownedItemIds: string[];
  coins: number;
  onPurchase: (item: RoomItem) => Promise<boolean>;
  onCharge: () => void;
  /** 메뉴 탭에서 쓰는 기록 버튼 선택 */
  menu: ActionId[];
  onChangeMenu: (next: ActionId[]) => void;
}

export default function DecorateSheet({
  open,
  onClose,
  onPick,
  category,
  onChangeCategory,
  onSave,
  saving,
  ownedItemIds,
  coins,
  onPurchase,
  onCharge,
  menu,
  onChangeMenu,
}: Props) {
  const [items, setItems] = useState<RoomItem[] | null>(null);
  const [buying, setBuying] = useState<RoomItem | null>(null);
  const [busy, setBusy] = useState(false);

  // 시트를 여는 쪽이 이미 이미지까지 받아 둔 상태라 여기서는 바로 끝난다.
  useEffect(() => {
    let alive = true;
    loadRoomItems().then((list) => alive && setItems(list));
    return () => {
      alive = false;
    };
  }, []);

  const owned = new Set(ownedItemIds);
  const isOwned = (item: RoomItem) => item.unlock === 'FREE' || owned.has(item.id);

  const active = CATEGORY_TABS.find((t) => t.id === category) ?? ITEM_TABS[0];
  const isMenuTab = active.categories.length === 0;
  // 탭 하나가 여러 시스템 분류를 묶는다 (벽지 = 벽지 + 바닥재).
  const wanted = new Set<string>(active.categories);
  const visible = items?.filter((i) => wanted.has(i.category)) ?? [];

  const tap = (item: RoomItem) => {
    if (isOwned(item)) {
      onPick(item);
      return;
    }
    setBuying(item);
  };

  const confirmPurchase = async () => {
    if (!buying) return;
    const price = buying.priceCoins ?? 0;
    // 잔액이 모자라면 구매 대신 충전으로 보낸다
    if (coins < price) {
      setBuying(null);
      onCharge();
      return;
    }
    setBusy(true);
    try {
      const ok = await onPurchase(buying);
      if (ok) setBuying(null);
    } finally {
      setBusy(false);
    }
  };

  const shortOnCoins = buying ? coins < (buying.priceCoins ?? 0) : false;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        // 아이템을 여러 개 연달아 고르다 바깥을 잘못 눌러 닫히지 않게, 취소로만 닫는다
        closeOnBackdrop={false}
        variant="sheet"
        maxHeight="378px"
        ariaLabel="아기방 꾸미기"
        surfaceClassName="bg-[#FDFDFE] rounded-t-[16px]"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="shrink-0 pt-[16px] relative">
            <div className="w-[36px] h-[4px] bg-[#121212] rounded-full mx-auto" />
            <p className="mt-[16px] text-center text-[#121212] text-[16px] leading-[1.4]">
              아기방 꾸미기
            </p>
            <div className="absolute right-[20px] top-[37px] flex gap-[4px] items-center">
              <GemIcon size={20} />
              <span className="text-[#121212] text-[12px] leading-[1.4] tabular-nums">{coins}</span>
            </div>
          </div>

          {/* 분류 탭 — 아이템이 없는 분류도 전부 띄운다. 비었으면 비었다고 말해준다. */}
          <div className="shrink-0 mt-[20px] px-[20px] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-[10px] items-start min-w-full w-max">
              {CATEGORY_TABS.map((c) => {
                const on = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChangeCategory(c.id)}
                    className="flex-1 min-w-[50px] h-[32px] px-[16px] rounded-[4px] border border-[#121212] text-[14px] leading-[1.4] whitespace-nowrap"
                    style={
                      on
                        ? { background: 'rgba(255,210,0,0.1)', color: '#121212' }
                        : { background: '#FDFDFE', color: '#808991' }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-[20px] pt-[24px]">
            {isMenuTab ? (
              <MenuPicker selected={menu} onChange={onChangeMenu} />
            ) : items === null ? (
              <p className="py-10 text-center text-[14px] text-[#808991]">불러오는 중</p>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-[#808991]">
                활성화된 {active.label} 아이템이 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-[10px] items-start content-start">
                {visible.map((item) => {
                  const mine = isOwned(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => tap(item)}
                      className="relative flex flex-col gap-[4px] items-center justify-center"
                    >
                      <span
                        className="size-[50px] flex items-center justify-center rounded-[4px] border overflow-hidden"
                        style={
                          mine
                            ? { background: '#FDFDFE', borderColor: '#121212' }
                            : { background: '#F7F8F9', borderColor: '#808991' }
                        }
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="size-full object-cover"
                            style={{ imageRendering: 'pixelated', opacity: mine ? 1 : 0.5 }}
                          />
                        ) : (
                          <span className="text-[10px] text-[#808991]">없음</span>
                        )}
                      </span>
                      <span
                        className="text-[12px] leading-[1.4] text-center whitespace-nowrap"
                        style={{ color: mine ? '#121212' : '#DFE0E1' }}
                      >
                        {item.name}
                      </span>
                      {/* 미보유 유료 아이템은 보석 뱃지를 단다 */}
                      {!mine && (
                        <span className="absolute left-[36px] top-[4px]">
                          <GemIcon size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 flex gap-[10px] items-start px-[20px] pt-[16px] pb-[max(var(--safe-area-bottom),16px)]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] active:translate-y-px disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] active:translate-y-px disabled:opacity-60"
            >
              {saving ? '저장 중' : '저장하기'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmModal
        open={buying !== null}
        imageUrl={buying?.imageUrl}
        title={<PriceTitle name={buying?.name ?? ''} price={buying?.priceCoins ?? 0} />}
        description={
          shortOnCoins ? (
            <>
              보석이 모자랍니다.
              <br />
              충전하고 바로 구매할 수 있어요.
            </>
          ) : (
            <>
              구매한 제품은 계속 보관되며
              <br />
              언제든 방 꾸미기에 사용할 수 있어요.
            </>
          )
        }
        confirmLabel={shortOnCoins ? '충전하기' : '구매하기'}
        busy={busy}
        onCancel={() => setBuying(null)}
        onConfirm={confirmPurchase}
      />
    </>
  );
}
