'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { CATEGORY_TABS, type CategoryTabId } from './scene';
import { GemIcon } from './icons';
import ConfirmModal, { PriceTitle } from './ConfirmModal';
import MenuPicker from './MenuPicker';
import { loadRoomItems, refreshRoomItems } from './roomItems';
import type { ActionId } from './RoomChrome';
import { LoadingBlock } from '@/components/Loading';

export type RoomItem = {
  id: string;
  spriteKey: string;
  name: string;
  category: string;
  surface: string;
  tileW: number;
  tileH: number;
  imageUrl: string | null;
  priceCoins: number;
  /** 아기가 이 아이템으로 할 수 있는 것. 서버가 아직 안 내려주면 없다. */
  affordances?: string[];
  /** 그림이 실시간 데이터로 바뀌는 자리. WEATHER 면 창문 밖 하늘을 날씨대로 칠한다. */
  dynamicSlot?: string | null;
  /** 옆모습(오른쪽을 보는 모습) 그림과 칸 수. 있으면 꾸미기에서 옆으로 돌려 놓을 수 있다. */
  sideImageUrl?: string | null;
  sideTileW?: number | null;
  sideTileH?: number | null;
  /** 뒷모습(벽 쪽을 보는 모습) 그림. 있으면 꾸미기에서 뒤로 돌려 놓을 수 있다. */
  backImageUrl?: string | null;
};

/**
 * 시트 최소 높이 — 아이템 두 줄이 들어가는 높이. 홈 인디케이터가 있으면 그만큼 늘린다.
 * 아이템이 더 많은 분류는 시트가 늘어나 전부 보인다(목록 안에서 스크롤하지 않게).
 * 아이템이 적거나 없어도 이보다 줄지 않아야 탭을 바꿀 때 시트가 들썩이지 않는다.
 * 닫기는 시트 바깥(방)을 누르면 된다.
 */
const SHEET_MIN_HEIGHT = 'calc(290px + max(var(--safe-area-bottom), 20px))';
/** 아이템이 아주 많아도 방 위쪽은 남긴다. 이걸 넘을 때만 목록이 스크롤된다. */
const SHEET_MAX_HEIGHT = 'calc(100dvh - var(--safe-area-top) - 120px)';

/** 아이템을 고르는 탭만. '메뉴' 탭은 기록 버튼을 고르는 거라 분류가 비어 있다. */
const ITEM_TABS = CATEGORY_TABS.filter((c) => c.categories.length > 0);

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: RoomItem) => void;
  category: CategoryTabId;
  onChangeCategory: (category: CategoryTabId) => void;
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
  const [menuDraft, setMenuDraft] = useState(menu);

  const listRef = useRef<HTMLDivElement>(null);

  // 시트를 여는 쪽이 이미 이미지까지 받아 둔 상태라 여기서는 바로 끝난다.
  // 시트는 닫혀도 마운트된 채 남아 있어서, 열릴 때마다 목록을 새로 받아 덮는다
  // — 그사이 운영자가 유료로 바꾼 아이템이 무료로 보이지 않게.
  useEffect(() => {
    if (!open) return;
    setMenuDraft(menu);
    let alive = true;
    loadRoomItems().then((list) => alive && setItems(list));
    refreshRoomItems().then((list) => alive && list && setItems(list));
    return () => {
      alive = false;
    };
  }, [open, menu]);

  const owned = new Set(ownedItemIds);
  const isOwned = (item: RoomItem) => item.priceCoins <= 0 || owned.has(item.id);

  const active = CATEGORY_TABS.find((t) => t.id === category) ?? ITEM_TABS[0];
  const isMenuTab = active.categories.length === 0;
  // 탭 하나가 여러 시스템 분류를 묶는다 (벽지 = 벽지 + 바닥재).
  const wanted = new Set<string>(active.categories);
  const visible = items?.filter((i) => wanted.has(i.category)) ?? [];

  // 탭을 바꾸면 목록 맨 위부터 보인다
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [open, category]);

  // 누르는 순간의 가격으로 판단한다. 시트를 연 사이 운영자가 유료로 바꿨을 수 있다.
  const tapping = useRef(false);
  const tap = async (item: RoomItem) => {
    if (tapping.current) return;
    tapping.current = true;
    try {
      const fresh = await refreshRoomItems();
      if (fresh) setItems(fresh);
      const latest = fresh?.find((i) => i.id === item.id);
      // 그새 판매가 내려간 아이템은 놓지 않는다
      if (fresh && !latest) return;
      const target = latest ?? item;
      if (isOwned(target)) onPick(target);
      else setBuying(target);
    } finally {
      tapping.current = false;
    }
  };

  const confirmPurchase = async () => {
    if (!buying) return;
    const price = buying.priceCoins;
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

  const shortOnCoins = buying ? coins < (buying.priceCoins) : false;

  const saveAndClose = () => {
    if (isMenuTab) onChangeMenu(menuDraft);
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        variant="sheet"
        maxHeight={SHEET_MAX_HEIGHT}
        ariaLabel="아기방 꾸미기"
        surfaceClassName="bg-[#FDFDFE] rounded-t-[16px]"
      >
        <div className="flex flex-col min-h-0" style={{ minHeight: SHEET_MIN_HEIGHT }}>
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
          {/* 가로로만 넘긴다. overflow-x 만 주면 세로도 auto 가 되어 탭 테두리만큼 위아래로 밀린다. */}
          <div
            className="shrink-0 mt-[16px] px-[20px] overflow-x-auto overflow-y-hidden overscroll-x-contain"
            style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
          >
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

          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-[20px] pt-[24px] pb-[max(var(--safe-area-bottom),20px)]"
          >
            <div className="min-h-[152px]">
              {isMenuTab ? (
                <MenuPicker selected={menuDraft} onChange={setMenuDraft} />
              ) : items === null ? (
                <LoadingBlock />
              ) : visible.length === 0 ? (
                <p className="pt-[15px] text-center text-[14px] leading-[1.4] text-[#808991]">
                  활성화된 {active.label} 아이템이 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(6,50px)] justify-between gap-y-[10px]">
                  {visible.map((item) => {
                    const mine = isOwned(item);
                    // 유료인데 보유 중이면 구매한 아이템. 무료 아이템과 겉모습이 같아 따로 표시한다.
                    const bought = item.priceCoins > 0 && mine;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => tap(item)}
                        className="relative flex flex-col gap-[4px] items-center justify-center"
                      >
                        <span
                          className="size-[50px] p-[4px] flex items-center justify-center rounded-[4px] border overflow-hidden"
                          style={
                            mine
                              ? { background: '#FDFDFE', borderColor: '#121212' }
                              : { background: '#F7F8F9', borderColor: '#BBC0C5' }
                          }
                        >
                          {/* 그림이 아직 없는 아이템은 디자인대로 빈 상자로 둔다.
                              그림마다 여백·비율이 달라 cover 로 채우면 가장자리가 잘린다.
                              안쪽 여백을 두고 contain 으로 넣어 모두 같은 틀 안에 온전히 보이게 한다. */}
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="size-full object-contain"
                              style={{ imageRendering: 'pixelated', opacity: mine ? 1 : 0.5 }}
                            />
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
                        {/* 구매한 아이템은 같은 자리에 체크 뱃지를 단다 */}
                        {bought && (
                          <span
                            aria-label="구매함"
                            className="absolute left-[35px] top-[3px] size-[12px] flex items-center justify-center rounded-[2px] border border-[#121212] bg-[#3078C9]"
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
                              {/* 픽셀 체크. 열마다 2px 높이 막대를 계단처럼 쌓는다 */}
                              {[[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2]].map(([x, y]) => (
                                <rect key={x} x={x} y={y} width="1" height="2" fill="#FDFDFE" />
                              ))}
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-[24px] flex gap-[10px]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveAndClose}
                className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>

      <ConfirmModal
        open={buying !== null}
        imageUrl={buying?.imageUrl}
        title={<PriceTitle name={buying?.name ?? ''} price={buying?.priceCoins ?? 0} />}
        // 보석이 모자라도 안내 문구는 같고, 버튼만 충전하기로 바뀐다(디자인).
        description={
          <>
            구매한 제품은 계속 보관되며
            <br />
            언제든 방 꾸미기에 사용할 수 있어요.
          </>
        }
        confirmLabel={shortOnCoins ? '충전하기' : '구매하기'}
        busy={busy}
        onCancel={() => setBuying(null)}
        onConfirm={confirmPurchase}
      />
    </>
  );
}
