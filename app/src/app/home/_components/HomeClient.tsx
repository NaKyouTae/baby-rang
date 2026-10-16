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
 * 기본은 한 명(single)이다.
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
 * 좌우 기록 버튼 구성. 아직 서버 저장이 없어 브라우저에 둔다.
 * 로그아웃·탈퇴 때 지워서 다음에 가입하는 계정은 기본 구성으로 시작한다(clearAuthCaches).
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
  // 주소(?kids=)로 고른 미리보기 구성. 없으면 한 명(single).
  const [urlDemoSet, setUrlDemoSet] = useState<DemoChild[] | null>(null);
  const [demoId, setDemoId] = useState('');
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const [decorating, setDecorating] = useState(false);
  // 편집 모드에 들어갈 때는 고른 탭 없이 시작한다. 탭을 눌러야 시트가 열린다.
  const [sheetCategory, setSheetCategory] = useState<CategoryTabId | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Placement | null>(null);
  const [menu, setMenu] = useState<ActionId[]>(loadSavedMenu);
  // 보유 목록과 재화. 비로그인 데모는 무료 아이템만 쓸 수 있다.
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  // 마이페이지·보석함은 주소에 올려 둔다. 하위 페이지에서 뒤로 오면 그대로 다시 뜬다.
  const { open: panels, openPanel, closePanel } = useHistoryPanels();
  const charging = panels.gems;
  const myPageOpen = panels.my;
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
  const demoSet = urlDemoSet ?? DEMO_SETS.single;

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
    // 불러오는 동안은 '기록 없음'이 깜빡이지 않게 비워 둔다.
    const show = (iso: string | null | undefined) =>
      lastRecords ? formatElapsed(iso ?? null, now) : '';
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
  const createQuickRecord = useCallback(
    async (type: GrowthType, action: Exclude<ActionId, 'settings'>, label: string) => {
      if (!childId || creatingRef.current) return;
      creatingRef.current = true;
      const now = new Date().toISOString();
      const fd = new FormData();
      fd.append('childId', childId);
      fd.append('type', type);
      fd.append('quickRecord', 'true');
      fd.append('startAt', now);
      if (TYPE_CONFIG[type].showEndPicker) fd.append('endAt', now);
      fd.append('memo', '');
      const data = buildDefaultRecordData(type);
      fd.append('data', JSON.stringify(data));
      fd.append('keepImageUrls', JSON.stringify([]));
      try {
        const res = await fetch('/api/growth-records', { method: 'POST', body: fd });
        if (res.ok) {
          showToast(`${label} 기록 완료`);
          const kind = data.kind;
          setReaction({
            key: Date.now(),
            id: action,
            variant: kind === 'POO' || kind === 'BOTH' ? kind : 'PEE',
          });
          reloadWidget();
          void refreshLastRecords();
          // 그날 첫 기록이면 보석 1개가 들어온다. 상단 잔액을 바로 맞춘다.
          reloadInventory();
        }
      } finally {
        creatingRef.current = false;
      }
    },
    [childId, refreshLastRecords, reloadInventory, showToast],
  );

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
  const handleDecorate = useCallback(() => {
    loadRoomItems();
    editSnapshotRef.current = { placements, slots };
    setSheetCategory(null);
    setEditing(true);
  }, [placements, slots]);

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
        onPet={handlePet}
        reaction={reaction}
      />

      {viewing ? (
        <ViewChrome onClose={() => setViewing(false)} />
      ) : editing ? (
        <EditChrome
          onClose={handleExitEdit}
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
          menu={menu}
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
        onClose={() => closePanel('my')}
        onOpenGems={openGems}
      />

      <GemStore
        open={charging}
        onClose={() => closePanel('gems')}
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
