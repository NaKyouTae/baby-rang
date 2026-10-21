'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/BottomSheet';
import { calcChildAge } from '@/lib/childAge';
import { groupTwins } from '@/lib/twins';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedChild } from '@/hooks/useChildren';
import { useLockAppScroll } from '@/hooks/useLockAppScroll';
import PixelScreen, { type RoomReaction } from './PixelScreen';
import DecorateSheet, { type RoomItem } from './DecorateSheet';
import { loadRoomItems, refreshRoomItems } from './roomItems';
import { TYPE_CONFIG, type GrowthType } from '../../growth-record/types';
import { buildDefaultRecordData } from '../../growth-record/recordDefaults';
import { reloadWidget } from '@/lib/widgetBridge';
import RemoveSheet from './RemoveSheet';
import { preloadSprites, type Placement } from './placements';
import { ROOM_W_TILES, WALL_TILES } from './tiles';
import RoomChrome, {
  ACTION_LABEL,
  DEFAULT_MENU,
  LEGACY_DEFAULT_MENUS,
  MENU_OPTIONS,
  MENU_SLOTS,
  type ActionId,
} from './RoomChrome';
import EditChrome from './EditChrome';
import ConfirmModal from './ConfirmModal';
import ViewChrome from './ViewChrome';
import type { CategoryTabId } from './scene';
import GemStore from './GemStore';
import MyPage from './MyPage';
import { formatElapsed, useLastRecords } from './useLastRecords';
import { useHistoryPanels } from './useHistoryPanels';

type DemoChild = { id: string; name: string; gender: string; birthDate: string };

/**
 * 로그인/아이 등록 전에도 화면을 볼 수 있게 두는 미리보기용 아이.
 * 로그인 전에는 다섯 쌍둥이(quints), 로그인했지만 아이가 없으면 한 명(single)을 보여 준다.
 * 주소에 ?kids=single · twins · multi · quints 를 붙이면 그 구성으로 볼 수 있다.
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
  // 생일이 같아 한 묶음(쌍둥이 카드)으로 묶이고, 방에 다섯 명이 함께 나온다
  quints: [
    { id: 'demo-q1', name: '하늘', gender: 'female', birthDate: demoBirthDate(10) },
    { id: 'demo-q2', name: '바다', gender: 'male', birthDate: demoBirthDate(10) },
    { id: 'demo-q3', name: '구름', gender: 'male', birthDate: demoBirthDate(10) },
    { id: 'demo-q4', name: '햇살', gender: 'female', birthDate: demoBirthDate(10) },
    { id: 'demo-q5', name: '새봄', gender: 'female', birthDate: demoBirthDate(10) },
  ],
};

function demoBirthDate(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

/** 배치를 임시로 담아두는 브라우저 저장소 키. 서버 저장이 생기면 사라진다. */
const STORAGE_KEY = 'babyrang.home.placements';
/** 자리가 고정된 슬롯(방·벽지·바닥·창문). 좌표가 없어 배치와 따로 저장한다. */
const ROOM_KEY = 'babyrang.home.room';
/**
 * 좌우 기록 버튼 구성. 원본은 계정(서버 /screen-preference)이고, 브라우저에는 첫 화면을 바로 그리려고 사본을 둔다.
 * 비로그인 데모는 브라우저에만 둔다.
 * 로그아웃·탈퇴 때 지워서 다음에 로그인하는 계정이 앞 계정의 구성을 잠깐이라도 보지 않게 한다(clearAuthCaches).
 */
const MENU_KEY = 'babyrang.home.menu';

/**
 * 저장소 키를 읽는다. 예전 키(babyrang.prototype.*)에만 값이 있으면
 * 새 키로 옮기고 예전 키는 지운다. 이미 꾸며 둔 방이 사라지지 않게 한다.
 */
function readStored(key: string): string | null {
  const value = localStorage.getItem(key);
  if (value !== null) return value;
  const legacyKey = key.replace('babyrang.home.', 'babyrang.prototype.');
  const legacy = localStorage.getItem(legacyKey);
  if (legacy === null) return null;
  localStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
}

function loadSavedMenu(): ActionId[] {
  if (typeof window === 'undefined') return DEFAULT_MENU;
  try {
    const raw = readStored(MENU_KEY);
    const saved = raw ? (JSON.parse(raw) as ActionId[]) : null;
    // 예전 구성에는 설정이 들어 있었다. 이제 설정은 고정이라 걸러낸다.
    const picked = Array.isArray(saved) ? saved.filter((id) => DEFAULT_MENU.includes(id)) : [];
    const isLegacyDefault = LEGACY_DEFAULT_MENUS.some(
      (legacy) => picked.length === legacy.length && picked.every((id, i) => id === legacy[i]),
    );
    return picked.length && !isLegacyDefault ? picked : DEFAULT_MENU;
  } catch {
    return DEFAULT_MENU;
  }
}

/** 서버에서 받은 구성 — 앱이 모르는 값(다른 버전에서 저장한 것)은 걸러 낸다 */
function toMenu(value: unknown): ActionId[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>(MENU_OPTIONS.map((o) => o.id));
  return value.filter((id): id is ActionId => typeof id === 'string' && known.has(id)).slice(0, MENU_SLOTS);
}


function saveMenuToServer(menu: ActionId[]) {
  fetch('/api/screen-preference', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordMenu: menu }),
  }).catch(() => {
    /* 실패해도 이 기기에는 남아 있다. 다음에 바꿀 때 다시 올라간다. */
  });
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
    const raw = readStored(ROOM_KEY);
    if (!raw) return EMPTY_SLOTS;
    const parsed = JSON.parse(raw);
    // 예전 형식(방 배경 하나)이나 지금 없어진 room 키는 버린다
    if (parsed && 'imageUrl' in parsed) return EMPTY_SLOTS;
    return { ...EMPTY_SLOTS, ...parsed };
  } catch {
    return EMPTY_SLOTS;
  }
}

/**
 * 저장된 방을 브라우저에도 남긴다. 다음에 열 때 서버 응답 전에 먼저 그리고, 데모(비로그인)는 이게 저장소다.
 * 꾸미는 도중에는 쓰지 않는다 — 저장하기를 누르기 전 변경이 새로고침 뒤에 남으면 저장된 줄 안다.
 */
function persistRoom(placements: Placement[], slots: Slots) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    localStorage.setItem(ROOM_KEY, JSON.stringify(slots));
  } catch {
    /* 용량 초과 등은 무시한다 — 다음 저장에서 다시 시도된다 */
  }
}

function loadSavedPlacements(): Placement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = readStored(STORAGE_KEY);
    // 반전이 생기기 전에 저장된 배치에는 flipX 가 없다
    return raw
      ? (JSON.parse(raw) as Placement[]).map((p) => ({ ...p, flipX: p.flipX ?? false }))
      : [];
  } catch {
    // 저장값이 깨졌으면 빈 방으로 시작한다
    return [];
  }
}

/**
 * 저장해 둔 방의 그림을 모듈이 로드되는 즉시 받기 시작한다.
 * 컴포넌트 effect 까지 기다리면 하이드레이션·측정이 끝난 뒤에야 요청이 나가서
 * 회색 기본 방이 한참 보였다가 벽지·바닥이 뒤늦게 덮인다.
 * 로그인 회원도 마지막으로 본 방이 같은 키에 남아 있어 여기서 같이 당겨진다.
 */
if (typeof window !== 'undefined') {
  try {
    const slots = loadSavedSlots();
    preloadSprites([
      slots.wallpaper?.imageUrl ?? null,
      slots.flooring?.imageUrl ?? null,
      ...loadSavedPlacements().map((p) => p.imageUrl),
    ]);
  } catch {
    /* 저장소를 못 읽으면 평소처럼 effect 에서 받는다 */
  }
}

/** 방의 기록 버튼 → 기록 화면의 기록 종류. 누르면 기본값으로 바로 저장한다. */
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

export default function HomeClient() {
  // 홈은 스크롤이 없는 전체화면이다. 셸 스크롤 컨테이너가 움직여 화면이 흔들리지 않게 잠근다.
  useLockAppScroll();
  const { children, selectedChild, selectChild } = useSelectedChild();
  const { isAuthenticated, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();
  // 주소(?kids=)로 고른 미리보기 구성. 없으면 로그인 여부로 정한다(아래 demoSet).
  const [urlDemoSet, setUrlDemoSet] = useState<DemoChild[] | null>(null);
  const [demoId, setDemoId] = useState('');
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const [decorating, setDecorating] = useState(false);
  // 편집 모드에 들어갈 때는 고른 탭 없이 시작한다. 탭을 눌러야 시트가 열린다.
  const [sheetCategory, setSheetCategory] = useState<CategoryTabId | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Placement | null>(null);
  // 기록 버튼 구성. 로그인 사용자는 계정에 저장된 구성을 받기 전까지 null 이라 버튼을 그리지 않는다.
  // 기본 구성을 먼저 그렸다가 사용자 구성으로 바뀌며 버튼이 뒤바뀌어 보이는 것을 막는다(편집 버튼만 늘 보인다).
  const [menu, setMenu] = useState<ActionId[] | null>(null);
  // 보유 목록과 재화. 비로그인 데모는 무료 아이템만 쓸 수 있다.
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  // 마이페이지·보석함은 주소에 올려 둔다. 하위 페이지에서 뒤로 오면 그대로 다시 뜬다.
  const { open: panels, openPanel, closePanel } = useHistoryPanels();
  const charging = panels.gems;
  const myPageOpen = panels.my;
  const [gemsOpenedFromSettings, setGemsOpenedFromSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  // 보기 모드 — 카드·버튼·탭바를 걷어내고 방만 본다.
  const [viewing, setViewing] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(loadSavedPlacements);
  const [slots, setSlots] = useState<Slots>(loadSavedSlots);
  // 서버의 방 버전. 공동 양육자가 먼저 바꿨으면 저장이 거절된다.
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);


  // 미리보기 구성은 주소에서 읽는다. 서버 렌더와 어긋나지 않게 마운트 뒤에 바꾼다.
  useEffect(() => {
    const set = DEMO_SETS[new URLSearchParams(location.search).get('kids') ?? ''];
    if (!set) return;
    setUrlDemoSet(set);
    setDemoId(set[0].id);
  }, []);
  const demoSet = urlDemoSet ?? (isAuthenticated ? DEMO_SETS.single : DEMO_SETS.quints);

  const isDemo = !selectedChild;
  const kidList: DemoChild[] = isDemo ? demoSet : children;
  const child = selectedChild ?? demoSet.find((c) => c.id === demoId) ?? demoSet[0];
  const age = useMemo(() => calcChildAge(child.birthDate), [child.birthDate]);

  const twinGroups = useMemo(() => groupTwins(kidList), [kidList]);
  const toGroup = (g: DemoChild[]) => ({
    key: g[0].id,
    kids: g.map((c) => ({ name: c.name, gender: c.gender })),
  });
  const currentGroup = useMemo(
    () => twinGroups.find((g) => g.some((c) => c.id === child.id)) ?? [child],
    [twinGroups, child],
  );
  // 다둥이는 방에 다 같이 나온다. 개월수는 아이마다 따로 잰다(이른둥이 교정 등으로 달라질 수 있다).
  const roomKids = useMemo(
    () =>
      currentGroup.map((c) => ({
        id: c.id,
        name: c.name,
        gender: c.gender,
        months: calcChildAge(c.birthDate).months,
      })),
    [currentGroup],
  );
  const handleSelectKids = (key: string) => {
    if (isDemo) {
      setDemoId(key);
      return;
    }
    const next = children.find((c) => c.id === key);
    if (next) selectChild(next);
  };

  // 디자인은 횟수가 아니라 '마지막 기록으로부터 지난 시간'을 보여준다.
  // 데모(아이 없음)는 고정 예시값, 실제 아이는 그 아이의 마지막 기록 시각.
  const { records: lastRecords, now, refresh: refreshLastRecords } = useLastRecords(
    selectedChild?.id,
  );
  const stats = useMemo(() => {
    if (isDemo) {
      return [
        { label: '수면', value: '1시간 43분 전' },
        { label: '수유', value: '3시간 42분 전' },
        { label: '기저귀', value: '48시간 25분 전' },
      ];
    }
    const show = (iso: string | null | undefined) =>
      formatElapsed(iso ?? null, now);
    return [
      { label: '수면', value: show(lastRecords?.sleepAt) },
      { label: '수유', value: show(lastRecords?.feedingAt) },
      { label: '기저귀', value: show(lastRecords?.diaperAt) },
    ];
  }, [isDemo, lastRecords, now]);


  useEffect(() => {
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  useEffect(() => {
    if (!menu) return;
    try {
      localStorage.setItem(MENU_KEY, JSON.stringify(menu));
    } catch {
      /* 용량 초과 등은 무시한다 */
    }
  }, [menu]);

  // 계정에 저장된 기록 버튼 구성을 받아 온다. 기기마다 달라 보이지 않게 서버 값이 이긴다.
  // 가입할 때 기본 구성이 DB 에 저장되므로 보통은 바로 사용자 값이 온다.
  // 그 전에 가입해 서버에 아직 없는 사용자는 이 기기의 구성(없으면 기본 구성)을 한 번 올려 둔다.
  // 비로그인 데모는 이 기기의 구성을 쓴다. 받아 오는 사이 사용자가 먼저 바꿨으면 그 값을 지킨다.
  const menuTouchedRef = useRef(false);
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isAuthenticated) {
      if (!menuTouchedRef.current) setMenu(loadSavedMenu());
      return;
    }
    let alive = true;
    fetch('/api/screen-preference', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || menuTouchedRef.current) return;
        const saved = toMenu(d?.recordMenu);
        if (saved.length) {
          setMenu(saved);
          return;
        }
        const local = loadSavedMenu();
        setMenu(local);
        if (d) saveMenuToServer(local);
      })
      // 못 받으면 이 기기에 남은 마지막 구성으로 그린다. 버튼이 아예 안 뜨는 것보다 낫다.
      .catch(() => {
        if (alive && !menuTouchedRef.current) setMenu(loadSavedMenu());
      });
    return () => {
      alive = false;
    };
  }, [isAuthLoaded, isAuthenticated]);

  // 메뉴 탭에서 바꿀 때마다 계정에 저장한다. 연달아 고르는 동안은 모았다가 한 번에 보낸다.
  const menuSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChangeMenu = useCallback(
    (next: ActionId[]) => {
      menuTouchedRef.current = true;
      setMenu(next);
      if (!isAuthenticated) return;
      if (menuSaveTimer.current) clearTimeout(menuSaveTimer.current);
      menuSaveTimer.current = setTimeout(() => saveMenuToServer(next), 500);
    },
    [isAuthenticated],
  );

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
              affordances: item.affordances,
            };
          }),
        );
        // 벽지·바닥도 같은 이유로 그림 주소를 카탈로그에 맞춘다.
        // 이미지를 줄여 다시 올리면 주소가 바뀌는데, 예전 주소를 들고 있으면 계속 큰 원본을 받는다.
        const fresh = (slot: Slot): Slot => {
          const item = slot && byId.get(slot.id);
          return item && item.imageUrl !== slot.imageUrl ? { ...slot, imageUrl: item.imageUrl } : slot;
        };
        setSlots((prev) => {
          const next = { wallpaper: fresh(prev.wallpaper), flooring: fresh(prev.flooring) };
          return next.wallpaper === prev.wallpaper && next.flooring === prev.flooring ? prev : next;
        });
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
          flipX: boolean;
          scale?: number;
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
          flipX: sp.flipX ?? false,
          scale: sp.scale ?? 1,
          affordances: sp.item.affordances,
        }));
        const toSlot = (it?: { id: string; imageUrl: string | null } | null): Slot =>
          it ? { id: it.id, imageUrl: it.imageUrl } : null;
        const nextSlots: Slots = {
          wallpaper: toSlot(data.room?.wallpaper),
          flooring: toSlot(data.room?.flooring),
        };
        setPlacements(loaded);
        setSlots(nextSlots);
        persistRoom(loaded, nextSlots);
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

  const reloadInventory = useCallback(() => {
    if (childId) loadInventory(childId);
  }, [childId, loadInventory]);

  // 토스 결제를 마치고 돌아오면(?gems=1) 보석함이 열린 채로 뜬다(useHistoryPanels).
  // 잔액은 위의 인벤토리 조회가 서버에서 적립까지 마친 값으로 받아 온다.
  // 결제 쿼리만 지운다 — 새로고침에 결제 결과가 다시 처리되지 않게.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('paymentStatus') && !params.has('orderId')) return;
    for (const k of ['paymentStatus', 'orderId']) params.delete(k);
    const qs = params.toString();
    history.replaceState({}, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

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
  // 로그인 전 미리보기에서 기록·보석·아이 카드를 누르면 로그인 화면으로 보낸다.
  // 로그인 여부를 아직 모르면(첫 로딩) 아무것도 하지 않는다.
  const goLogin = useCallback(() => {
    if (isAuthLoaded) router.push('/login');
  }, [isAuthLoaded, router]);
  const openGems = useCallback(() => {
    if (!isAuthenticated) return goLogin();
    setGemsOpenedFromSettings(false);
    openPanel('gems');
  }, [isAuthenticated, goLogin, openPanel]);
  const openGemsFromSettings = useCallback(() => {
    if (!isAuthenticated) return goLogin();
    setGemsOpenedFromSettings(true);
    openPanel('gems');
  }, [isAuthenticated, goLogin, openPanel]);

  // 저장 안내 토스트 — 2.5초 뒤 사라진다. 연달아 저장하면 시간을 새로 잰다.
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), text });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // 기록을 저장하면 방의 아이(다둥이는 모두)가 그 기록의 반응을 보여 준다
  const [reaction, setReaction] = useState<RoomReaction | null>(null);

  // 기록 버튼 — 시트 없이 기본값으로 바로 저장한다(기록 화면의 빠른 버튼과 같다).
  const creatingRef = useRef(false);
  const queuedSleepTapRef = useRef(false);
  const pendingSleepRecordRef = useRef<{ childId: string; recordId: string } | null>(null);
  const finishedSleepRecordRef = useRef<string | null>(null);
  const createQuickRecordRef = useRef<(
    type: GrowthType,
    action: Exclude<ActionId, 'settings'>,
    label: string,
  ) => Promise<void>>(async () => {});
  const createQuickRecord = useCallback(
    async (type: GrowthType, action: Exclude<ActionId, 'settings'>, label: string) => {
      if (!childId) return;
      if (creatingRef.current) {
        // 수면은 연속 두 번 눌러 종료하므로 첫 저장 중 들어온 두 번째 탭을 보존한다.
        if (type === 'SLEEP') queuedSleepTapRef.current = true;
        return;
      }
      if (type !== 'SLEEP') pendingSleepRecordRef.current = null;
      creatingRef.current = true;
      const now = new Date().toISOString();
      const fd = new FormData();
      const data = buildDefaultRecordData(type);
      const summarySleepRecordId =
        lastRecords?.childId === childId && lastRecords.canEndSleep
          ? lastRecords.pendingSleepRecordId
          : null;
      const pendingSleepRecordId =
        type === 'SLEEP'
          ? (pendingSleepRecordRef.current?.childId === childId
              ? pendingSleepRecordRef.current.recordId
              : summarySleepRecordId !== finishedSleepRecordRef.current
                ? summarySleepRecordId
                : null)
          : null;
      if (pendingSleepRecordId) {
        fd.append('endAt', now);
      } else {
        fd.append('childId', childId);
        fd.append('type', type);
        fd.append('quickRecord', 'true');
        fd.append('startAt', now);
        if (TYPE_CONFIG[type].showEndPicker) fd.append('endAt', now);
        fd.append('memo', '');
        fd.append('data', JSON.stringify(data));
        fd.append('keepImageUrls', JSON.stringify([]));
      }
      let succeeded = false;
      try {
        const res = await fetch(
          pendingSleepRecordId ? `/api/growth-records/${pendingSleepRecordId}` : '/api/growth-records',
          { method: pendingSleepRecordId ? 'PATCH' : 'POST', body: fd },
        );
        if (res.ok) {
          succeeded = true;
          const savedRecord = await res.json().catch(() => null);
          if (type === 'SLEEP') {
            if (pendingSleepRecordId) {
              pendingSleepRecordRef.current = null;
              finishedSleepRecordRef.current = pendingSleepRecordId;
            } else {
              pendingSleepRecordRef.current =
                typeof savedRecord?.id === 'string' ? { childId, recordId: savedRecord.id } : null;
            }
          }
          showToast(pendingSleepRecordId ? '수면 종료 기록 완료' : `${label} 기록 완료`);
          const kind = data.kind;
          setReaction({
            key: Date.now(),
            id: action,
            variant: kind === 'POO' || kind === 'BOTH' ? kind : 'PEE',
          });
          // 종료 탭이 대기 중이면 첫 응답의 요약 조회가 종료 후 상태를 덮지 않게 건너뛴다.
          const hasQueuedSleepTap = type === 'SLEEP' && queuedSleepTapRef.current;
          if (!hasQueuedSleepTap) {
            reloadWidget();
            void refreshLastRecords();
          }
          // 그날 첫 기록이면 보석 1개가 들어온다. 상단 잔액을 바로 맞춘다.
          reloadInventory();
        }
      } finally {
        const replaySleepTap = succeeded && queuedSleepTapRef.current;
        queuedSleepTapRef.current = false;
        creatingRef.current = false;
        if (replaySleepTap) {
          window.setTimeout(() => {
            void createQuickRecordRef.current('SLEEP', 'sleep', ACTION_LABEL.sleep);
          }, 0);
        }
      }
    },
    [childId, lastRecords, refreshLastRecords, reloadInventory, showToast],
  );
  createQuickRecordRef.current = createQuickRecord;

  const handleAction = useCallback((id: ActionId) => {
    // 설정은 입력 폼이 아니라 마이페이지로 간다.
    if (id === 'settings') {
      openPanel('my');
      return;
    }
    // 로그인 전에는 기록할 곳이 없다 — 로그인 화면으로 보낸다
    if (!isAuthenticated) return goLogin();
    // 로그인했지만 아이를 아직 등록하지 않았으면 안내 시트만 띄운다
    if (!childId) {
      setOpenAction(id);
      return;
    }
    void createQuickRecord(GROWTH_TYPE_OF[id], id, ACTION_LABEL[id]);
  }, [openPanel, isAuthenticated, goLogin, childId, createQuickRecord]);
  const handlePet = useCallback(() => {}, []);
  // 꾸미기 버튼 — 편집 모드로 들어간다. 저장은 X 를 누를 때 한 번에 한다.
  // 카탈로그와 이미지를 미리 받아 둬서 분류 탭을 눌렀을 때 바로 뜨게 한다.
  // 편집 모드에 들어갈 때의 방. 저장하지 않고 나가면 이걸로 되돌린다.
  const editSnapshotRef = useRef<{ placements: Placement[]; slots: Slots } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // 꾸미기는 로그인해야 한다. 데모 방을 꾸며도 저장할 곳이 없다.
  const handleDecorate = useCallback(() => {
    if (!isAuthenticated) return goLogin();
    loadRoomItems();
    editSnapshotRef.current = { placements, slots };
    setSheetCategory(null);
    setEditing(true);
  }, [isAuthenticated, goLogin, placements, slots]);

  const discardEdit = useCallback(() => {
    const snap = editSnapshotRef.current;
    if (snap) {
      setPlacements(snap.placements);
      setSlots(snap.slots);
    }
    editSnapshotRef.current = null;
    setConfirmDiscard(false);
    setDecorating(false);
    setEditing(false);
  }, []);

  // X — 저장은 저장하기 버튼으로만 한다. 바꾼 게 있으면 버릴지 먼저 묻는다.
  const handleExitEdit = useCallback(() => {
    const snap = editSnapshotRef.current;
    const changed =
      !snap || snap.placements !== placements || snap.slots !== slots;
    if (changed) setConfirmDiscard(true);
    else discardEdit();
  }, [placements, slots, discardEdit]);


  // 저장 — 방 전체를 한 번에 덮어쓴다. 가구 하나씩 보내면 겹침 검사를 매번 전체로
  // 다시 해야 하고, 공동 양육자가 동시에 편집할 때 깨진다.
  const handleSaveEdit = useCallback(async () => {
    // 저장 버튼을 연달아 눌러 같은 내용을 두 번 보내는 걸 막는다
    if (saving) return;
    if (!childId) {
      // 데모(비로그인)는 브라우저 저장만 쓴다
      persistRoom(placements, slots);
      editSnapshotRef.current = null;
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
          // 배열 순서가 곧 겹침 순서다. 다시 불러올 때 이 순서로 정렬한다.
          placements: placements.map((p, i) => ({
            itemId: p.itemId,
            tileX: p.tileX,
            tileY: p.tileY,
            flipX: p.flipX,
            scale: p.scale ?? 1,
            zOffset: i,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || '저장에 실패했습니다.');
        return;
      }
      setVersion(data.version ?? version + 1);
      persistRoom(placements, slots);
      editSnapshotRef.current = null;
      setDecorating(false);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [saving, childId, version, slots, placements]);

  // 이미지가 다 준비된 다음에 시트를 연다. 빈 칸이 먼저 보였다가 채워지지 않게.
  // 목록은 열 때마다 새로 받는다(가격이 바뀌었을 수 있다). 이미지는 처음 받은 것을 쓴다.
  const handlePickTab = useCallback(async (tab: CategoryTabId) => {
    setSheetCategory(tab);
    await Promise.all([loadRoomItems(), refreshRoomItems()]);
    setDecorating(true);
  }, []);

  // 시트에서 막 놓은 가구. 방에서 바로 선택된 상태로 보이게 넘긴다.
  const [focusPlacementId, setFocusPlacementId] = useState<string | null>(null);

  // 고른 가구를 방 가운데에 놓는다. 시트는 닫고 놓은 가구를 선택해 두므로 바로 끌어 옮기면 된다.
  const handlePick = useCallback((item: RoomItem) => {
    preloadSprites([item.imageUrl]);
    setDecorating(false);

    // 방·벽지·바닥·창문은 자리가 고정돼 있다. '놓는' 게 아니라 '바꾸는' 것이고
    // 각각 하나씩만 적용된다.
    const slot = SLOT_OF[item.category];
    if (slot) {
      setSlots((prev) => ({ ...prev, [slot]: { id: item.id, imageUrl: item.imageUrl } }));
      return;
    }

    const id = crypto.randomUUID();
    setFocusPlacementId(id);
    setPlacements((prev) => [
      ...prev,
      {
        id,
        itemId: item.id,
        name: item.name,
        spriteKey: item.spriteKey,
        imageUrl: item.imageUrl,
        category: item.category,
        tileX: Math.max(0, Math.round((ROOM_W_TILES - item.tileW) / 2)),
        // 벽에 거는 것(창문·액자)은 벽 쪽에, 나머지는 바닥 가운데에 놓는다.
        // 창문이 바닥 한가운데 떨어지면 뭘 잘못한 줄 안다.
        tileY: item.surface === 'WALL' ? 2 : WALL_TILES + 2,
        tileW: item.tileW,
        tileH: item.tileH,
        flipX: false,
        affordances: item.affordances,
      },
    ]);
  }, []);

  // 옮긴 가구는 맨 위로 올린다 — 겹친 가구는 나중에 놓은(옮긴) 것이 위에 그려진다
  const handleMovePlacement = useCallback((id: string, tileX: number, tileY: number) => {
    setPlacements((prev) => {
      const moved = prev.find((p) => p.id === id);
      if (!moved) return prev;
      return [...prev.filter((p) => p.id !== id), { ...moved, tileX, tileY }];
    });
  }, []);

  const handleFlipPlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, flipX: !p.flipX } : p)));
  }, []);

  const handleResizePlacement = useCallback((id: string, scale: number, tileX: number, tileY: number) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, scale, tileX, tileY } : p)));
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setRemoveTarget(null);
  }, []);

  return (
    // 폰트는 여기 한 곳에서만 정한다. 바텀시트도 이 안에 있어 전부 물려받는다.
    <div
      className="relative h-full overflow-hidden select-none bg-[#EEF0F1]"
      style={{ fontFamily: 'Galmuri11Fig, Galmuri11, monospace' }}
    >
      <PixelScreen
        kids={roomKids}
        wallpaperUrl={slots.wallpaper?.imageUrl ?? null}
        flooringUrl={slots.flooring?.imageUrl ?? null}
        placements={placements}
        editing={editing}
        onMovePlacement={handleMovePlacement}
        onTapPlacement={handleFlipPlacement}
        onResizePlacement={handleResizePlacement}
        onLongPressPlacement={setRemoveTarget}
        focusId={focusPlacementId}
        onPet={handlePet}
        reaction={reaction}
      />

      {viewing ? (
        <ViewChrome onClose={() => setViewing(false)} />
      ) : editing ? (
        <EditChrome
          onClose={handleExitEdit}
          onSave={handleSaveEdit}
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
            onTap: isAuthenticated ? undefined : goLogin,
          }}
          gems={coins}
          stats={stats}
          sleepPending={!isDemo && lastRecords?.canEndSleep === true}
          menu={menu ?? []}
          onAction={handleAction}
          onDecorate={handleDecorate}
          onView={() => setViewing(true)}
          onOpenGems={openGems}
          toast={toast}
          showTabBar={!myPageOpen && !charging}
        />
      )}

      {/* 광고 — 앱은 네이티브 AdMob 이 이 자리를 덮고, 웹은 카카오 애드핏이 들어온다 */}

      <DecorateSheet
        open={decorating && !charging}
        onClose={() => setDecorating(false)}
        onPick={handlePick}
        category={sheetCategory ?? 'wallpaper'}
        onChangeCategory={setSheetCategory}
        ownedItemIds={ownedItemIds}
        coins={coins}
        onPurchase={handlePurchase}
        onCharge={openGems}
        menu={menu ?? []}
        onChangeMenu={handleChangeMenu}
      />

      <MyPage
        open={myPageOpen && !charging}
        onClose={() => closePanel('my')}
        onOpenGems={openGemsFromSettings}
      />

      <GemStore
        open={charging}
        onClose={() => closePanel('gems')}
        showBackButton={gemsOpenedFromSettings}
        coins={coins}
        childId={childId}
        onCharged={reloadInventory}
      />

      <ConfirmModal
        open={confirmDiscard}
        showThumbnail={false}
        title="저장하지 않고 나갈까요?"
        description="꾸민 내용은 저장하기를 눌러야 남습니다."
        confirmLabel="나가기"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={discardEdit}
      />

      <RemoveSheet
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onRemove={handleRemovePlacement}
      />

      {/* 로그인했지만 아이가 없을 때 기록 버튼을 누르면 저장할 곳이 없어 안내만 한다. */}
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
            아이를 등록하면 기록할 수 있습니다.
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
