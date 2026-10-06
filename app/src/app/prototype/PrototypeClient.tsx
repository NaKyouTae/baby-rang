'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { calcChildAge } from '@/lib/childAge';
import { useSelectedChild } from '@/hooks/useChildren';
import PixelScreen from './PixelScreen';
import DecorateSheet, { type RoomItem } from './DecorateSheet';
import { loadRoomItems } from './roomItems';
import EntrySheet from '../growth-record/EntrySheet';
import type { GrowthType } from '../growth-record/types';
import RemoveSheet from './RemoveSheet';
import { preloadSprites, type Placement } from './placements';
import { ROOM_W_TILES, WALL_TILES } from './tiles';
import { poseForMonths } from './pixelSprite';
import RoomChrome, { ACTION_LABEL, DEFAULT_MENU, type ActionId } from './RoomChrome';
import EditChrome from './EditChrome';
import type { CategoryTabId } from './scene';
import PrototypeAdSlot from './PrototypeAdSlot';
import GemStore from './GemStore';
import MyPage from './MyPage';

type DemoChild = { id: string; name: string; gender: string; birthDate: string };

/**
 * 로그인/아이 등록 전에도 화면을 볼 수 있게 두는 미리보기용 아이.
 * 주소에 ?kids=twins 나 ?kids=multi 를 붙이면 쌍둥이·여러 아이 화면을 볼 수 있다.
 */
const DEMO_SETS: Record<string, DemoChild[]> = {
  single: [{ id: 'demo', name: '아기', gender: '', birthDate: demoBirthDate(14) }],
  twins: [
    { id: 'demo-a', name: '나하성', gender: 'male', birthDate: demoBirthDate(3) },
    { id: 'demo-b', name: '나하빈', gender: 'female', birthDate: demoBirthDate(3) },
  ],
  multi: [
    { id: 'demo-a', name: '나하빈', gender: 'female', birthDate: demoBirthDate(3) },
    { id: 'demo-b', name: '나하성', gender: 'male', birthDate: demoBirthDate(14) },
    { id: 'demo-c', name: '박우주', gender: 'male', birthDate: demoBirthDate(20) },
    { id: 'demo-d', name: '김선유', gender: 'female', birthDate: demoBirthDate(26) },
    { id: 'demo-e', name: '강나윤', gender: 'female', birthDate: demoBirthDate(32) },
  ],
};

/** 생일이 같은 아이는 쌍둥이로 보고 한 묶음으로 친다. 순서는 목록 순서를 따른다. */
function groupTwins<T extends { id: string; birthDate: string }>(list: T[]): T[][] {
  const byDate = new Map<string, T[]>();
  for (const c of list) {
    const g = byDate.get(c.birthDate);
    if (g) g.push(c);
    else byDate.set(c.birthDate, [c]);
  }
  return [...byDate.values()];
}

function demoBirthDate(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

/** 배치를 임시로 담아두는 브라우저 저장소 키. 서버 저장이 생기면 사라진다. */
const STORAGE_KEY = 'babyrang.prototype.placements';
/** 자리가 고정된 슬롯(방·벽지·바닥·창문). 좌표가 없어 배치와 따로 저장한다. */
const ROOM_KEY = 'babyrang.prototype.room';
/** 좌우 기록 버튼 구성. 아직 서버 저장이 없어 브라우저에 둔다. */
const MENU_KEY = 'babyrang.prototype.menu';

function loadSavedMenu(): ActionId[] {
  if (typeof window === 'undefined') return DEFAULT_MENU;
  try {
    const raw = localStorage.getItem(MENU_KEY);
    const saved = raw ? (JSON.parse(raw) as ActionId[]) : null;
    // 예전 구성에는 설정이 들어 있었다. 이제 설정은 고정이라 걸러낸다.
    const picked = Array.isArray(saved) ? saved.filter((id) => id !== 'settings') : [];
    return picked.length ? picked : DEFAULT_MENU;
  } catch {
    return DEFAULT_MENU;
  }
}

type Slot = { id: string; imageUrl: string | null } | null;
type Slots = { wallpaper: Slot; flooring: Slot };
const EMPTY_SLOTS: Slots = { wallpaper: null, flooring: null };

/**
 * 어드민 분류 → 고정 슬롯 이름. 여기 없는 분류는 자유 배치다.
 * 창문은 벽 아무 데나 걸 수 있어야 해서 배치 쪽으로 뺐다.
 */
const SLOT_OF: Record<string, keyof Slots> = {
  WALLPAPER: 'wallpaper',
  FLOORING: 'flooring',
};

/**
 * 저장해 둔 배치를 읽는다.
 * 첫 렌더에서 바로 쓰려고 effect 가 아니라 useState 초기값으로 넣는다 —
 * effect 에서 setState 하면 빈 방이 한 번 그려졌다가 덮인다.
 */
function loadSavedSlots(): Slots {
  if (typeof window === 'undefined') return EMPTY_SLOTS;
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    if (!raw) return EMPTY_SLOTS;
    const parsed = JSON.parse(raw);
    // 예전 형식(방 배경 하나)이나 지금 없어진 room 키는 버린다
    if (parsed && 'imageUrl' in parsed) return EMPTY_SLOTS;
    return { ...EMPTY_SLOTS, ...parsed };
  } catch {
    return EMPTY_SLOTS;
  }
}

function loadSavedPlacements(): Placement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Placement[]) : [];
  } catch {
    // 저장값이 깨졌으면 빈 방으로 시작한다
    return [];
  }
}

/** 방의 기록 버튼 → 기록 화면의 기록 종류. 같은 입력 시트를 그대로 띄운다. */
const GROWTH_TYPE_OF: Record<Exclude<ActionId, 'settings'>, GrowthType> = {
  formula: 'FORMULA',
  breast: 'BREASTFEEDING',
  pumped: 'PUMPED_FEEDING',
  pumping: 'PUMPING',
  babyfood: 'BABY_FOOD',
  sleep: 'SLEEP',
  diaper: 'DIAPER',
  bath: 'BATH',
  temperature: 'TEMPERATURE',
  medication: 'MEDICATION',
  water: 'WATER',
  milk: 'MILK',
  snack: 'SNACK',
  play: 'PLAY',
  hospital: 'HOSPITAL',
  etc: 'ETC',
};

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PrototypeClient() {
  const { children, selectedChild, selectChild } = useSelectedChild();
  const [demoSet, setDemoSet] = useState<DemoChild[]>(DEMO_SETS.single);
  const [demoId, setDemoId] = useState(DEMO_SETS.single[0].id);
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [sheetCategory, setSheetCategory] = useState<CategoryTabId>('wallpaper');
  const [removeTarget, setRemoveTarget] = useState<Placement | null>(null);
  const [menu, setMenu] = useState<ActionId[]>(loadSavedMenu);
  // 보유 목록과 재화. 비로그인 데모는 무료 아이템만 쓸 수 있다.
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [charging, setCharging] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);
  // 재화 적립 로직은 아직 없다. 디자인 확인용 고정값.
  const gems = 10;
  const [editing, setEditing] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(loadSavedPlacements);
  const [slots, setSlots] = useState<Slots>(loadSavedSlots);
  // 서버의 방 버전. 공동 양육자가 먼저 바꿨으면 저장이 거절된다.
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);


  // 미리보기 구성은 주소에서 읽는다. 서버 렌더와 어긋나지 않게 마운트 뒤에 바꾼다.
  useEffect(() => {
    const set = DEMO_SETS[new URLSearchParams(location.search).get('kids') ?? ''];
    if (!set) return;
    setDemoSet(set);
    setDemoId(set[0].id);
  }, []);

  const isDemo = !selectedChild;
  const kidList: DemoChild[] = isDemo ? demoSet : children;
  const child = selectedChild ?? demoSet.find((c) => c.id === demoId) ?? demoSet[0];
  const age = useMemo(() => calcChildAge(child.birthDate), [child.birthDate]);
  const pose = poseForMonths(age.months);

  const twinGroups = useMemo(() => groupTwins(kidList), [kidList]);
  const toGroup = (g: DemoChild[]) => ({
    key: g[0].id,
    kids: g.map((c) => ({ name: c.name, gender: c.gender })),
  });
  const currentGroup = twinGroups.find((g) => g.some((c) => c.id === child.id)) ?? [child];
  const handleSelectKids = (key: string) => {
    if (isDemo) {
      setDemoId(key);
      return;
    }
    const next = children.find((c) => c.id === key);
    if (next) selectChild(next);
  };

  // 디자인은 횟수가 아니라 '마지막 기록으로부터 지난 시간'을 보여준다.
  // 기록 API 에 아직 안 물려서 데모만 값이 있고 실제 아이는 비워 둔다.
  const stats = useMemo(
    () => [
      { label: '수면', value: isDemo ? '1시간 43분 전' : '기록 없음' },
      { label: '수유', value: isDemo ? '3시간 42분 전' : '기록 없음' },
      { label: '기저귀', value: isDemo ? '48시간 25분 전' : '기록 없음' },
    ],
    [isDemo],
  );

  // 배치 저장 API 가 아직 없다. 새로고침에 날아가지 않도록 임시로 브라우저에 둔다.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    } catch {
      /* 용량 초과 등은 무시한다 — 다음 저장에서 다시 시도된다 */
    }
  }, [placements]);

  useEffect(() => {
    try {
      localStorage.setItem(ROOM_KEY, JSON.stringify(slots));
    } catch {
      /* 용량 초과 등은 무시한다 */
    }
  }, [slots]);

  useEffect(() => {
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  useEffect(() => {
    try {
      localStorage.setItem(MENU_KEY, JSON.stringify(menu));
    } catch {
      /* 용량 초과 등은 무시한다 */
    }
  }, [menu]);

  // 카탈로그를 한 번 받아 배치 정보를 최신으로 맞춘다.
  // 예전 형식으로 저장된 배치에는 분류가 없어서, 러그인 줄 모르고 아이를 가렸다.
  // 아이템의 이름·칸 수·그림은 카탈로그가 원본이므로 여기서 다시 채운다.
  useEffect(() => {
    fetch('/api/room-items')
      .then((r) => r.json())
      .then((d) => {
        const byId = new Map<string, RoomItem>(
          ((d.items ?? []) as RoomItem[]).map((i) => [i.id, i]),
        );
        setPlacements((prev) =>
          prev.map((p) => {
            const item = byId.get(p.itemId);
            if (!item) return p;
            return {
              ...p,
              name: item.name,
              spriteKey: item.spriteKey,
              imageUrl: item.imageUrl,
              category: item.category,
              tileW: item.tileW,
              tileH: item.tileH,
              spriteLiftY: item.spriteLiftY,
            };
          }),
        );
      })
      .catch(() => {
        /* 카탈로그를 못 받아도 저장된 배치는 그대로 쓴다 */
      });
  }, []);

  // 서버에 저장된 방을 불러온다. 데모(비로그인)는 브라우저 저장만 쓴다.
  const childId = selectedChild?.id;
  useEffect(() => {
    if (!childId) return;
    let alive = true;
    fetch(`/api/rooms/${childId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        type ServerPlacement = {
          id: string;
          itemId: string;
          tileX: number;
          tileY: number;
          item: RoomItem;
        };
        const loaded: Placement[] = (data.placements ?? []).map((sp: ServerPlacement) => ({
          id: sp.id,
          itemId: sp.itemId,
          name: sp.item.name,
          spriteKey: sp.item.spriteKey,
          imageUrl: sp.item.imageUrl,
          category: sp.item.category,
          tileX: sp.tileX,
          tileY: sp.tileY,
          tileW: sp.item.tileW,
          tileH: sp.item.tileH,
          spriteLiftY: sp.item.spriteLiftY,
        }));
        const toSlot = (it?: { id: string; imageUrl: string | null } | null): Slot =>
          it ? { id: it.id, imageUrl: it.imageUrl } : null;
        const nextSlots: Slots = {
          wallpaper: toSlot(data.room?.wallpaper),
          flooring: toSlot(data.room?.flooring),
        };
        setPlacements(loaded);
        setSlots(nextSlots);
        setVersion(data.version ?? 0);
        preloadSprites([
          ...loaded.map((pl) => pl.imageUrl),
          ...Object.values(nextSlots).map((v) => v?.imageUrl ?? null),
        ]);
      })
      .catch(() => {
        /* 불러오기 실패는 빈 방으로 둔다 — 저장은 여전히 가능하다 */
      });
    return () => {
      alive = false;
    };
  }, [childId]);

  // 보유 목록과 재화 잔액. 결제한 충전분도 서버가 여기서 메워 준다.
  const loadInventory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/rooms/inventory/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setOwnedItemIds(data.ownedItemIds ?? []);
      setCoins(data.coins ?? 0);
    } catch {
      /* 못 받아도 무료 아이템은 그대로 쓸 수 있다 */
    }
  }, []);

  useEffect(() => {
    if (!childId) return;
    loadInventory(childId);
  }, [childId, loadInventory]);

  const handlePurchase = useCallback(
    async (item: RoomItem) => {
      if (!childId) {
        alert('로그인 후 구매할 수 있습니다.');
        return false;
      }
      const res = await fetch(
        `/api/rooms/purchase/${item.id}?childId=${encodeURIComponent(childId)}`,
        { method: 'POST' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || '구매에 실패했습니다.');
        return false;
      }
      setOwnedItemIds(data.ownedItemIds ?? []);
      setCoins(data.coins ?? 0);
      return true;
    },
    [childId],
  );

  // 보석함은 꾸미기 시트(z-70)보다 아래에 그려진다. 겹쳐 두면 시트에 가리므로
  // 여는 동안만 시트를 접고, 닫을 때 원래 보던 화면으로 되돌린다.
  const openGems = useCallback(() => setCharging(true), []);

  const handleAction = useCallback((id: ActionId) => {
    // 설정은 입력 폼이 아니라 마이페이지로 간다.
    if (id === 'settings') {
      setMyPageOpen(true);
      return;
    }
    setOpenAction(id);
  }, []);
  const handlePet = useCallback(() => {}, []);
  // 꾸미기 버튼 — 편집 모드로 들어간다. 저장은 X 를 누를 때 한 번에 한다.
  // 카탈로그와 이미지를 미리 받아 둬서 분류 탭을 눌렀을 때 바로 뜨게 한다.
  const handleDecorate = useCallback(() => {
    loadRoomItems();
    setEditing(true);
  }, []);


  // 저장 — 방 전체를 한 번에 덮어쓴다. 가구 하나씩 보내면 겹침 검사를 매번 전체로
  // 다시 해야 하고, 공동 양육자가 동시에 편집할 때 깨진다.
  const handleSaveEdit = useCallback(async () => {
    // 저장 버튼을 연달아 눌러 같은 내용을 두 번 보내는 걸 막는다
    if (saving) return;
    if (!childId) {
      // 데모(비로그인)는 브라우저 저장만 쓴다
        setDecorating(false);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${childId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          wallpaperItemId: slots.wallpaper?.id ?? null,
          flooringItemId: slots.flooring?.id ?? null,
          placements: placements.map((p) => ({
            itemId: p.itemId,
            tileX: p.tileX,
            tileY: p.tileY,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || '저장에 실패했습니다.');
        return;
      }
      setVersion(data.version ?? version + 1);
        setDecorating(false);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [saving, childId, version, slots, placements]);

  // 이미지가 다 준비된 다음에 시트를 연다. 빈 칸이 먼저 보였다가 채워지지 않게.
  const handlePickTab = useCallback(async (tab: CategoryTabId) => {
    setSheetCategory(tab);
    await loadRoomItems();
    setDecorating(true);
  }, []);

  // 고른 가구를 방 가운데에 놓는다. 그다음 끌어서 옮기면 된다.
  // 시트는 열어 둔다. 여러 개를 연달아 놓고 취소로 닫는다.
  const handlePick = useCallback((item: RoomItem) => {
    preloadSprites([item.imageUrl]);

    // 방·벽지·바닥·창문은 자리가 고정돼 있다. '놓는' 게 아니라 '바꾸는' 것이고
    // 각각 하나씩만 적용된다.
    const slot = SLOT_OF[item.category];
    if (slot) {
      setSlots((prev) => ({ ...prev, [slot]: { id: item.id, imageUrl: item.imageUrl } }));
      return;
    }

    setPlacements((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        spriteKey: item.spriteKey,
        imageUrl: item.imageUrl,
        category: item.category,
        tileX: Math.max(0, Math.round((ROOM_W_TILES - item.tileW) / 2)),
        // 벽에 거는 것(창문·액자)은 벽 쪽에, 나머지는 바닥 가운데에 놓는다.
        // 창문이 바닥 한가운데 떨어지면 뭘 잘못한 줄 안다.
        tileY: item.surface === 'WALL' ? 2 : WALL_TILES + 4,
        tileW: item.tileW,
        tileH: item.tileH,
        spriteLiftY: item.spriteLiftY,
      },
    ]);
  }, []);

  const handleMovePlacement = useCallback((id: string, tileX: number, tileY: number) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, tileX, tileY } : p)));
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setRemoveTarget(null);
  }, []);

  return (
    // 폰트는 여기 한 곳에서만 정한다. 바텀시트도 이 안에 있어 전부 물려받는다.
    <div
      className="relative h-full overflow-hidden select-none bg-[#EEF0F1]"
      style={{ fontFamily: 'Galmuri11, monospace' }}
    >
      <PixelScreen
        months={age.months}
        pose={pose}
        childName={child.name}
        wallpaperUrl={slots.wallpaper?.imageUrl ?? null}
        flooringUrl={slots.flooring?.imageUrl ?? null}
        placements={placements}
        editing={editing}
        onMovePlacement={handleMovePlacement}
        onLongPressPlacement={setRemoveTarget}
        onPet={handlePet}
      />

      {editing ? (
        <EditChrome
          onClose={handleSaveEdit}
          saving={saving}
          activeTab={sheetCategory}
          onPickTab={handlePickTab}
        />
      ) : (
        <RoomChrome
          kids={{
            current: toGroup(currentGroup),
            groups: twinGroups.map(toGroup),
            ageParts: [`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`],
            onSelect: handleSelectKids,
          }}
          gems={gems}
          stats={stats}
          menu={menu}
          onAction={handleAction}
          onDecorate={handleDecorate}
          onOpenGems={openGems}
        />
      )}

      {/* 광고 — 앱은 네이티브 AdMob 이 이 자리를 덮고, 웹은 카카오 애드핏이 들어온다 */}
      <PrototypeAdSlot />

      <DecorateSheet
        open={decorating && !charging}
        onClose={() => setDecorating(false)}
        onPick={handlePick}
        category={sheetCategory}
        onChangeCategory={setSheetCategory}
        onSave={handleSaveEdit}
        saving={saving}
        ownedItemIds={ownedItemIds}
        coins={coins}
        onPurchase={handlePurchase}
        onCharge={openGems}
        menu={menu}
        onChangeMenu={setMenu}
      />

      <MyPage
        open={myPageOpen && !charging}
        onClose={() => setMyPageOpen(false)}
        onOpenGems={openGems}
      />

      <GemStore
        open={charging}
        onClose={() => setCharging(false)}
        coins={coins}
        childId={childId}
      />

      <RemoveSheet
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onRemove={handleRemovePlacement}
      />

      {/* 기록 버튼 — 기록 화면과 같은 입력 시트. 데모(아이 없음)는 저장할 곳이 없어 안내만 한다. */}
      {openAction && openAction !== 'settings' && childId && (
        <EntrySheet
          childId={childId}
          type={GROWTH_TYPE_OF[openAction]}
          defaultDate={todayString()}
          onClose={() => setOpenAction(null)}
          onSaved={() => setOpenAction(null)}
        />
      )}
      <BottomSheet
        open={openAction !== null && !childId}
        onClose={() => setOpenAction(null)}
        variant="sheet"
        ariaLabel={openAction ? ACTION_LABEL[openAction] : undefined}
        surfaceClassName="bg-[#FDFDFE] rounded-t-[16px]"
      >
        <div className="px-5 pt-4 pb-[max(var(--safe-area-bottom),20px)]">
          <h2 className="text-[16px] text-[#121212]">{openAction && ACTION_LABEL[openAction]}</h2>
          <p className="text-[14px] text-[#808991] mt-2 leading-[1.4]">
            로그인하고 아이를 등록하면 기록할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setOpenAction(null)}
            className="mt-5 w-full h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] active:translate-y-px"
          >
            닫기
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
