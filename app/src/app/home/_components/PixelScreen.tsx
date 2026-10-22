'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FLOOR_TOP,
  ROOM_H_TILES,
  ROOM_W,
  ROOM_W_TILES,
  TILE,
  TOP_HIDDEN,
  VIEW_MARGIN_TILES,
  VIEW_ROWS,
  viewScaleFor,
} from './tiles';
import { getSpriteAt, getWindowSpriteAt, hOf, imageOf, isSide, nextTurn, preloadSprites, wOf, type Placement } from './placements';
import { phaseAtHour, type WindowSky } from './windowSky';
import { layout, type Layout } from './scene';
import { drawDefaultFloor, drawDefaultWall } from './roomTiles';
import { Dust, drawEditGrid, drawItemShadow } from './roomEffects';
import {
  BED_FRONT,
  HEAD_TOP,
  actorDepth,
  actorSprite,
  createActor,
  createProp,
  dropActor,
  moveHeldActor,
  petActor,
  pickUpActor,
  propDepth,
  reactActor,
  propSprite,
  updateActor,
  updateWorld,
  type Actor,
  type Prop,
  type Spot,
  type World,
} from './babyActor';
import { RES, type Affordance, type DiaperVariant, type RecordId } from './babySprite';
import { carryTarget, drawHands, startCarry, updateCarry, type Carry } from './caretaker';

/** 방에 나오는 아이 한 명. 다둥이면 여러 명이 같은 방에 함께 있다. */
export interface RoomKid {
  id: string;
  name: string;
  gender: string;
  months: number;
}

interface Props {
  kids: RoomKid[];
  /** 자리가 고정된 슬롯. 좌표가 없어 배치가 아니라 방의 속성이다. */
  wallpaperUrl: string | null;
  flooringUrl: string | null;
  placements: Placement[];
  /** 꾸미기 모드에서만 가구를 집을 수 있다. */
  editing: boolean;
  onMovePlacement: (id: string, tileX: number, tileY: number) => void;
  /**
   * 고른 가구 위쪽의 돌리기 버튼. 정면 → 옆(오른쪽) → 뒤 → 옆(왼쪽), 그림이 없는 방향은 건너뛴다.
   * 가구를 탭하면 고르기만 한다 — 탭마다 돌아가면 고르려고 누르다 방향이 바뀌어 버린다.
   */
  onRotatePlacement: (id: string) => void;
  /** 고른 가구 오른쪽의 뒤집기 버튼. 좌우 반전. */
  onFlipPlacement: (id: string) => void;
  onLongPressPlacement: (placement: Placement) => void;
  /** 바깥에서 고르게 할 가구. 바뀔 때마다 그 가구를 누른 것처럼 선택한다. */
  focusId?: string | null;
  onPet: () => void;
  /** 기록을 저장했을 때 아이들이 보여 줄 반응. key 가 바뀔 때마다 한 번 재생한다. */
  reaction?: RoomReaction | null;
  /** 날씨 창문(dynamicSlot = WEATHER) 밖에 칠할 하늘. 없으면 그림 그대로 그린다. */
  windowSky?: WindowSky;
}

export interface RoomReaction {
  key: number;
  id: RecordId;
  variant: DiaperVariant;
}

/** 기록 반응을 보여 주는 시간 */
const REACTION_MS = 5000;

/**
 * 아이템 쓰임새. 어드민에서 아이템마다 정한 값을 쓰고, 정하지 않은 아이템은 분류로 짐작한다.
 * 공·보행기는 분류로 알 수 없어 반드시 어드민에서 정해야 한다.
 */
const CATEGORY_AFFORDANCE: Partial<Record<string, Affordance[]>> = {
  FURNITURE: ['hold'],
  BED: ['hold', 'bed'],
  RUG: ['soft'],
  TOY: ['play'],
};
const AFFORDANCE_OF: Record<string, Affordance> = {
  HOLD: 'hold',
  SOFT_FLOOR: 'soft',
  BALL: 'ball',
  PUSH_WALKER: 'walker',
  PLAY: 'play',
  SLEEP: 'bed',
  SEAT: 'seat',
  SLIDE: 'slide',
};
function affordancesOf(p: Placement): Affordance[] {
  if (p.affordances?.length) return p.affordances.map((a) => AFFORDANCE_OF[a]).filter(Boolean);
  return CATEGORY_AFFORDANCE[p.category] ?? [];
}
const isProp = (aff: Affordance[]) => aff.includes('ball') || aff.includes('walker');
/** 방금 놓은 아이템으로 치는 시간 — 이 동안 그 아이템을 쓰는 행동이 2.5배 자주 나온다 */
const NOVEL_MS = 30 * 60 * 1000;
/**
 * 보호자 손이 기지 못하는 아기를 옮겨 주는 간격(ms) — [처음, 그다음 최소, 그다음 최대].
 * 로컬에서 바로 보려면 주소에 ?carry=fast 를 붙인다.
 */
const CARRY_GAP = [3 * 60_000, 10 * 60_000, 20 * 60_000] as const;
const CARRY_GAP_FAST = [5_000, 15_000, 25_000] as const;

/** 아기를 이만큼 꾹 누르면 들어 올린다(ms). 쓰다듬기(짧게 누르기)와 헷갈리지 않을 만큼. */
const PICK_UP_MS = 350;

/**
 * 화면을 떠났다 돌아와도 아이들이 하던 걸 이어서 하도록 아이·장난감 상태를 모듈에 들고 있는다.
 * 컴포넌트가 다시 마운트돼도 그대로고, 앱을 새로 열 때만 비워진다. 저장하지 않는다.
 * 시각은 모두 performance.now() 기준이라 그대로 이어 쓸 수 있다.
 */
const actorCache = new Map<string, { key: string; actor: Actor }>();
const propCache = new Map<string, { prop: Prop; tileX: number; tileY: number }>();

/**
 * 아이 방 캔버스.
 *
 * UI(카드·버튼·탭바)는 전부 DOM 으로 올라간다. 캔버스는 방·가구·아이만 그린다.
 * 둘을 한 캔버스에 그리면 한글 글자를 픽셀로 찍어야 하고, 접근성도 잃는다.
 */
export default function PixelScreen(props: Props) {
  const {
    kids,
    wallpaperUrl,
    flooringUrl,
    placements,
    editing,
    onMovePlacement,
    onRotatePlacement,
    onFlipPlacement,
    onLongPressPlacement,
    focusId = null,
    onPet,
    reaction,
    windowSky,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /**
   * w·h 캔버스 크기(방 픽셀, 방 밖 여백 포함) · scale 방 픽셀 하나의 CSS 크기 · shift 위로 올린 높이(CSS)
   * offsetX 캔버스 안에서 방(12칸)이 시작하는 x · left 캔버스를 둘 CSS x(기기 픽셀에 맞춤)
   */
  const [size, setSize] = useState<{
    w: number;
    h: number;
    scale: number;
    shift: number;
    offsetX: number;
    left: number;
    /** 아래 안전 영역(방 픽셀) */
    safeBottom: number;
    /** 보이는 화면 폭(CSS) */
    viewW: number;
  } | null>(null);
  // 가구를 놓을 수 있는 범위 — 어느 기기든 같은 무대(VIEW_W × VIEW_H). 좌우는 방(12칸) 밖 2칸씩,
  // 세로는 무대 아래 끝까지. 화면이 무대보다 크면 남는 곳은 벽·바닥만 이어 보이고 가구는 놓지 않는다.
  // 기기마다 범위가 같아야 웹에서 끝에 붙인 가구가 앱에서 안으로 당겨지지 않는다. 칸 좌표는 방 왼쪽 끝이 0 이라
  // 방 왼쪽 밖은 음수다.
  const bounds: PlaceBounds = size
    ? { minX: -VIEW_MARGIN_TILES, maxX: ROOM_W_TILES + VIEW_MARGIN_TILES, rows: VIEW_ROWS }
    : { minX: 0, maxX: ROOM_W_TILES, rows: ROOM_H_TILES };
  const { minX, maxX, rows } = bounds;

  // 드래그 중인 가구. 렌더 루프가 테두리를 그리려고 읽는다.
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ tx: 0, ty: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  // 마지막으로 누른 가구. 크기 버튼을 그 위에 띄운다. 렌더 루프는 테두리를 그리려고 ref 로 읽는다.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  // 꾸미기를 끝내면 선택도 푼다
  if (!editing && selectedId) setSelectedId(null);
  // 시트에서 막 놓은 가구는 바로 선택해 둔다 — 크기·위치를 이어서 만지게.
  const [lastFocusId, setLastFocusId] = useState(focusId);
  if (focusId !== lastFocusId) {
    setLastFocusId(focusId);
    if (editing && focusId) setSelectedId(focusId);
  }

  const layoutRef = useRef<Layout | null>(null);
  const petRef = useRef<(nx: number, ny: number) => void>(() => {});
  /**
   * 아기 들어서 옮기기 — 아기를 꾹 누르면 들어 올리고, 끌어서 놓은 자리(가구)에 맞춰 내려놓는다.
   * 아기 목록·세계는 렌더 effect 안에 있어 함수로 넘겨받는다.
   */
  const babyRef = useRef<{
    at: (nx: number, ny: number) => Actor | null;
    pickUp: (a: Actor, nx: number, ny: number) => void;
    move: (a: Actor, nx: number, ny: number) => void;
    drop: (a: Actor) => void;
  } | null>(null);
  /** 누르고 있는 아기와 들어 올렸는지. 누른 자리에서 손가락이 많이 움직이면 들기를 취소한다. */
  const holdRef = useRef<{ actor: Actor; x: number; y: number; picked: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const reactRef = useRef<(r: RoomReaction) => void>(() => {});

  // 기록 반응 — 다둥이면 방에 있는 아이 모두가 같은 반응을 한다
  useEffect(() => {
    if (reaction) reactRef.current(reaction);
  }, [reaction]);

  // 렌더 루프는 아이 구성이 실제로 바뀔 때만 다시 세운다.
  // kids 배열은 렌더마다 새로 만들어져서 그대로 deps 에 넣으면 아이들이 계속 제자리로 돌아간다.
  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  // 처음 본 시각 — 화면을 연 뒤에 새로 놓인 아이템만 "새것"으로 친다. 저장하지 않는다.
  const firstSeenRef = useRef<Map<string, number> | null>(null);

  const kidsRef = useRef(kids);
  const kidsKey = kids.map((k) => `${k.id}:${k.gender}:${k.months}`).join('|');
  useEffect(() => {
    kidsRef.current = kids;
  }, [kids]);

  // 배치와 슬롯을 ref 로 들고 있는다. deps 에 넣으면 가구를 놓을 때마다
  // 렌더 루프가 다시 서면서 아이 위치가 초기화된다.
  const placementsRef = useRef(placements);
  useEffect(() => {
    // 긴 화면에서 아래쪽에 놓은 가구는 짧은 화면에선 방 밖에 있다. 그릴 때만 안으로 당긴다.
    placementsRef.current = placements.map((p) => clampToRoom(p, { minX, maxX, rows }));
    preloadSprites(placements.flatMap((p) => [p.imageUrl, p.sideImageUrl ?? null]));
  }, [placements, minX, maxX, rows]);

  // 창문 밖 하늘도 렌더 루프가 매 프레임 읽는다. 날씨가 바뀌어도 루프를 다시 세우지 않는다.
  const windowSkyRef = useRef(windowSky);
  useEffect(() => {
    windowSkyRef.current = windowSky;
  }, [windowSky]);

  const slotsRef = useRef({ wallpaperUrl, flooringUrl });
  useEffect(() => {
    slotsRef.current = { wallpaperUrl, flooringUrl };
    preloadSprites([wallpaperUrl, flooringUrl]);
  }, [wallpaperUrl, flooringUrl]);

  // 어느 기기든 같은 무대(VIEW_W × VIEW_H, tiles.ts)가 화면에 꼭 들어가게 배율을 정한다(viewScaleFor).
  // 무대가 화면보다 작으면 남는 곳은 방 양옆·아래에 벽·바닥을 이어 그려 채운다(늘리지 않는다).
  // 콘텐츠 영역(상태바 아래) 맨 위에는 어느 기기든 방의 TOP_HIDDEN 높이가 온다. 그래서 웹·앱이 같은 칸, 같은 벽 경계를 보여 준다.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = window.devicePixelRatio || 1;
      const snap = (v: number) => Math.round(v * dpr) / dpr;
      const safeTop = measureSafeTop();
      const scale = viewScaleFor(r.width, r.height - safeTop);
      // 상태바가 덮는 만큼은 이미 가려져 있으니, 모자란 만큼만 방을 위로 올린다(웹은 상태바가 0).
      const shift = Math.max(0, snap(TOP_HIDDEN * scale - safeTop));
      // 양옆 1픽셀씩 더 그려 둔다. 가운데 맞춤을 기기 픽셀로 반올림해도 화면 끝에 빈 줄이 남지 않게.
      const w = Math.max(ROOM_W, Math.ceil(r.width / scale) + 2);
      const h = Math.ceil((r.height + shift) / scale);
      const offsetX = Math.floor((w - ROOM_W) / 2);
      // 방(12칸) 가운데가 화면 가운데에 오게 둔다. 기기 픽셀 경계에 맞춰야 픽셀이 반 칸씩 어긋나지 않는다.
      const left = snap(r.width / 2 - (offsetX + ROOM_W / 2) * scale);
      const safeCss = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom'));
      const safeBottom = Number.isFinite(safeCss) ? Math.round(safeCss / scale) : 0;
      setSize({ w, h, scale, shift, offsetX, left, safeBottom, viewW: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const L: Layout = layout(size.w, size.h, size.safeBottom, size.offsetX);
    layoutRef.current = L;

    const wallBottom = FLOOR_TOP;

    // 이미 방에 있던 아이는 하던 행동과 자리를 그대로 이어 간다. 방 크기가 바뀌었으면 안쪽으로만 당긴다.
    // 처음 들어온 아이는 방 안 아무 데서나 시작한다. 다둥이는 가로 구간을 나눠 서로 겹치지 않게 둔다.
    const list = kidsRef.current;
    const { x0, x1, y0, y1 } = L.walk;
    const keep = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));
    const band = (x1 - x0) / list.length;
    const babies = list.map((k, i) => {
      const key = `${k.gender}:${k.months}`;
      const cached = actorCache.get(k.id);
      if (cached && cached.key === key) {
        const a = cached.actor;
        a.x = keep(a.x, x0, x1);
        a.y = keep(a.y, y0, y1);
        a.tx = keep(a.tx, x0, x1);
        a.ty = keep(a.ty, y0, y1);
        return a;
      }
      const x = x0 + band * (i + 0.2 + Math.random() * 0.6);
      const y = y0 + (y1 - y0) * (0.2 + Math.random() * 0.6);
      // 다 같이 한꺼번에 움직이면 군무처럼 보인다. 첫 행동 선택을 아이마다 어긋나게 둔다.
      const actor = createActor(k.months, k.gender, x, y, performance.now() + i * 700 + Math.random() * 1500);
      actorCache.set(k.id, { key, actor });
      return actor;
    });
    for (const id of actorCache.keys()) if (!list.some((k) => k.id === id)) actorCache.delete(id);
    // 방에서 빠진 아이가 쥐고 있던 장난감은 내려놓는다
    for (const { prop } of propCache.values()) {
      if (prop.heldBy && !babies.includes(prop.heldBy)) {
        prop.heldBy = null;
        prop.locked = false;
      }
    }

    /**
     * 아기가 쓸 수 있는 아이템. 꾸미기로 바뀔 수 있어 매 프레임 배치에서 다시 만든다.
     *   붙잡기·러그·장난감 — 놓인 자리가 그대로 행동 장소다.
     *   공·보행기 — 아기가 움직이면 같이 움직이는 물체. 위치는 화면에서만 바뀌고 저장하지 않는다.
     */
    const props = propCache;
    const world: World = { bounds: L.walk, spots: [], props: [], novel: new Set() };
    const syncWorld = (now: number) => {
      const seen = firstSeenRef.current ?? new Map<string, number>();
      const fresh = !firstSeenRef.current;
      firstSeenRef.current = seen;
      const spots: Spot[] = [];
      const live: Prop[] = [];
      world.novel.clear();
      for (const p of placementsRef.current) {
        if (!seen.has(p.id)) seen.set(p.id, fresh ? 0 : now);
        if (now - seen.get(p.id)! < NOVEL_MS && seen.get(p.id)! > 0) world.novel.add(p.id);
        const aff = affordancesOf(p);
        if (!aff.length) continue;
        const x0 = L.offsetX + p.tileX * TILE;
        const x1 = x0 + wOf(p) * TILE;
        const y0 = p.tileY * TILE;
        const y1 = (p.tileY + hOf(p)) * TILE;
        // 벽에 걸렸거나 하단 UI 에 가린 아이템은 쓸 수 없다
        if (y1 < wallBottom + 4 || y0 > L.walk.y1) continue;
        if (isProp(aff)) {
          let entry = props.get(p.id);
          // 꾸미기로 옮겼거나 꾸미는 중이면 놓인 자리로 되돌린다
          if (!entry || entry.tileX !== p.tileX || entry.tileY !== p.tileY || editingRef.current) {
            const prop = entry?.prop ?? createProp(p.id, aff.includes('ball') ? 'ball' : 'walker', 0, 0);
            prop.x = (x0 + x1) / 2;
            prop.y = Math.min(y1, L.walk.y1);
            prop.vx = prop.vy = 0;
            entry = { prop, tileX: p.tileX, tileY: p.tileY };
            props.set(p.id, entry);
          }
          live.push(entry.prop);
          continue;
        }
        const spot = {
          id: p.id,
          aff,
          x0: Math.max(x0, L.walk.x0),
          x1: Math.min(x1, L.walk.x1),
          y0: Math.max(y0, wallBottom),
          y1: Math.min(y1, L.walk.y1),
          // 침대에서는 그림 칸 전체로 매트리스 위치를 잡고, 반전해 놓았으면 머리도 반대로 둔다
          box: { x0, x1, y0, y1 },
          flip: p.flipX,
          // 옆으로 돌려 놓은 가구 — 침대는 세로로 눕고, 붙잡기·의자는 앞면 쪽에서 옆모습으로 쓴다
          side: isSide(p),
        };
        if (spot.x1 - spot.x0 >= 8) spots.push(spot);
      }
      for (const id of props.keys()) if (!live.some((pr) => pr.id === id)) props.delete(id);
      world.spots = spots;
      // 꾸미는 중에는 공·보행기를 가구처럼 집어 옮길 수 있어야 해서 아이들에게 내주지 않는다.
      // 가지고 놀던 아이는 장난감이 사라진 것으로 보고 다른 행동으로 넘어간다.
      world.props = editingRef.current ? [] : live;
    };
    const hearts: { x: number; y: number; at: number }[] = [];
    const dust = new Dust();
    /**
     * 보호자 손 — 아직 기지 못하는 아기를 때맞춰 다른 자리로 옮겨 준다(caretaker).
     *   낮에는 10~20분마다 러그·침대·빈 바닥 중 한 곳으로, 밤에는 침대로.
     *   잠 기록을 저장하면 반응이 끝난 뒤 바로 침대로 옮긴다(이건 기어다니는 아기도).
     */
    const carries = new Map<Actor, Carry>();
    const fastCarry = new URLSearchParams(location.search).get('carry') === 'fast';
    const gap = fastCarry ? CARRY_GAP_FAST : CARRY_GAP;
    const carryNext = new Map<Actor, number>();
    const wantBed = new Set<Actor>();
    const t0 = performance.now();
    for (const b of babies) carryNext.set(b, t0 + gap[0] * (0.7 + Math.random() * 0.6));
    const scheduleCarries = (now: number) => {
      if (editingRef.current) return;
      for (const b of babies) {
        if (carries.has(b) || b.held || b.reaction) continue;
        const sleepy = wantBed.has(b);
        const due = !b.locomotion && now >= (carryNext.get(b) ?? Infinity);
        if (!sleepy && !due) continue;
        // 밤에 이미 침대에서 자는 아기는 그대로 둔다
        const bedOnly = sleepy || !!world.night;
        const to = bedOnly && b.inBed ? null : carryTarget(b, world, bedOnly);
        wantBed.delete(b);
        carryNext.set(b, now + gap[1] + Math.random() * (gap[2] - gap[1]));
        if (to) carries.set(b, startCarry(b, to, now));
      }
    };
    /** 가구별 지금 불투명도 — 아이를 가리면 서서히 흐려졌다가 아이가 나오면 서서히 돌아온다 */
    const fade = new Map<string, number>();
    // 로컬에서 창밖 시간대를 확인하려고 주소에 ?hour=21 처럼 시각을 줄 수 있다(화면 연출만 바뀐다)
    const hourParam = Number(new URLSearchParams(location.search).get('hour'));
    const hourOverride = Number.isFinite(hourParam) && location.search.includes('hour=') ? hourParam : null;
    /** 바닥에 놓인 가구인가 — 러그·창문·벽에 건 것(아랫변이 벽 안)은 그림자를 드리우지 않는다 */
    const onFloor = (p: Placement) =>
      p.category !== 'RUG' && p.category !== 'WINDOW' && (p.tileY + hOf(p)) * TILE > FLOOR_TOP;
    /** 기거나 걷는 행동 — 발밑에 먼지가 인다(빠를수록 자주) */
    const DUST_GAP: Record<string, number> = { crawl: 260, cruise: 300, toddle: 220, walk: 240, run: 140, pushWalker: 220 };

    // 쓰다듬기 — 누른 곳에서 가장 가까운 아이가 반응한다
    petRef.current = (nx, ny) => {
      const mid = HEAD_TOP / 2;
      let near = babies[0];
      for (const b of babies) {
        if (Math.hypot(b.x - nx, b.y - mid - ny) < Math.hypot(near.x - nx, near.y - mid - ny)) near = b;
      }
      if (!near) return;
      hearts.push({ x: near.x, y: near.y, at: performance.now() });
      petActor(near, performance.now());
    };
    // 들어서 옮기기 — 손가락 아래(발 위치는 손가락보다 조금 아래)를 따라간다
    const HOLD_DROP = 6;
    const feet = (nx: number, ny: number) => ({ x: nx, y: ny + HOLD_DROP });
    babyRef.current = {
      // 누른 곳에 그려진 아기 — 앞(아래)에 있는 아기부터
      at: (nx, ny) => {
        const hit = babies
          .filter((b) => !carries.has(b))
          .filter((b) => {
            const { left, top, width, height } = actorSprite(b);
            return nx >= left + 4 && nx <= left + width - 4 && ny >= top + 4 && ny <= top + height;
          })
          .sort((a, b) => actorDepth(b) - actorDepth(a));
        return hit[0] ?? null;
      },
      pickUp: (a, nx, ny) => {
        pickUpActor(a);
        const f = feet(nx, ny);
        moveHeldActor(a, f.x, f.y);
      },
      move: (a, nx, ny) => {
        const f = feet(nx, ny);
        moveHeldActor(a, f.x, f.y);
      },
      drop: (a) => {
        const now = performance.now();
        syncWorld(now);
        dropActor(a, now, world);
        hearts.push({ x: a.x, y: a.y, at: now });
      },
    };
    reactRef.current = (r) => {
      const now = performance.now();
      for (const b of babies) {
        // 보호자가 옮기는 중이거나 사용자가 들고 있으면 반응은 건너뛴다
        if (carries.has(b) || b.held) continue;
        reactActor(b, r.id, r.variant, now, REACTION_MS);
        if (r.id === 'sleep') wantBed.add(b);
      }
    };

    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      // 탭 전환 등으로 프레임이 크게 벌어져도 순간이동하지 않게 묶는다
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      syncWorld(now);
      // 밤(저녁 8시~아침 7시)에는 침대에서 자는 일이 훨씬 잦다
      const hour = new Date().getHours();
      world.night = hour >= 20 || hour < 7;
      // 꾸미는 동안에도 아이들은 논다. 공·보행기만 놓인 자리에 고정해 집어 옮길 수 있게 한다(syncWorld).
      updateWorld(world, dt);
      scheduleCarries(now);
      for (const [b, c] of carries) if (updateCarry(c, now, world)) carries.delete(b);
      for (const b of babies) {
        updateActor(b, now, dt, world);
        const gap = DUST_GAP[b.act];
        if (b.moving && !b.reaction && gap) dust.step(b, b.x, b.y, now, gap);
      }

      // 캔버스는 아기 해상도(RES)만큼 촘촘하다. 좌표는 전부 방 픽셀로 쓰고 여기서 한 번 키운다.
      // 방·가구는 칸마다 RES×RES 로 그대로 커지고, 아기 그림만 그 격자를 다 쓴다.
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, L.w, L.h);

      const slots = slotsRef.current;

      // 벽지·바닥재 — 자리가 고정돼 있어 벽/바닥 전체를 타일로 채운다.
      // 고른 것이 없거나 그림을 아직 못 받았으면 코드로 찍은 기본 벽지·마루를 깐다(아기·가구와 같은 픽셀 격자).
      // 무늬는 방 왼쪽 끝(offsetX)에 맞춰 반복해 방 밖 여백까지 같은 격자로 이어진다.
      const tileFill = (url: string | null, y0: number, y1: number) => {
        // 타일 크기로 미리 줄인 그림을 1:1 로 깐다
        const img = url ? getSpriteAt(url, TILE, TILE) : null;
        if (!img) return false;
        const startX = L.offsetX - Math.ceil(L.offsetX / TILE) * TILE;
        for (let ty = y0; ty < y1; ty += TILE) {
          for (let tx = startX; tx < L.w; tx += TILE) ctx.drawImage(img, tx, ty);
        }
        return true;
      };
      // 벽·바닥은 화면 끝까지 채운다(방 밖 여백·몰딩 없이)
      if (!tileFill(slots.wallpaperUrl, 0, wallBottom)) drawDefaultWall(ctx, L.offsetX, L.w, wallBottom);
      if (!tileFill(slots.flooringUrl, wallBottom, L.h)) drawDefaultFloor(ctx, L.offsetX, L.w, wallBottom, L.h);
      // 꾸미기 중에는 칸 격자를 보여 준다 — 가구가 칸에 맞춰 붙는다는 걸 알 수 있게
      if (editingRef.current) drawEditGrid(ctx, L.offsetX, L.w, L.h, TILE);
      // 발밑 먼지 — 바닥 높이라 가구·아기보다 먼저 그린다
      dust.draw(ctx, now);

      /**
       * 그리기 순서.
       *   가구끼리는 나중에 놓은(옮긴) 것이 위 — 꾸미는 사람이 겹쳐 놓은 그대로 보인다.
       *   아기·공·보행기는 겹친 가구와 발 위치로 앞뒤를 정한다. 가구 아랫변이 발보다 앞(화면 아래)이면
       *   그 가구가 아기를 가리므로 그 가구 바로 앞 순서에 끼워 넣는다.
       *   러그는 밟고 지나가는 것이라 항상 맨 아래.
       */
      type Rect = { x0: number; y0: number; x1: number; y1: number };
      const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      const furniture: { id: string; base: number; rect: Rect; draw: () => void }[] = [];
      const dynamics: { depth: number; rect: Rect; after?: string; draw: () => void }[] = [];
      const all = placementsRef.current;
      // 창밖 시간대 — 밤·노을은 창문 하늘로만 보여 준다(확인용 ?hour= 도 먹는다)
      const clock = new Date();
      const hourNow = hourOverride ?? clock.getHours() + clock.getMinutes() / 60;
      const skyPhase = phaseAtHour(hourNow);
      const ordered = [...all.filter((p) => p.category === 'RUG'), ...all.filter((p) => p.category !== 'RUG')];
      // 아이 몸이 차지하는 자리(그림 칸보다 좁게 — 머리부터 발까지). 앞쪽 가구가 이 자리를 덮으면 그 가구를 흐리게 한다.
      // 스타듀밸리처럼 캐릭터를 가리는 앞쪽 물체만 반투명해져, 가구 뒤로 간 아이가 사라지지 않는다.
      const bodies = babies
        .filter((b) => !b.inBed)
        .map((b) => ({ x0: b.x - 7, x1: b.x + 7, y0: b.y - 24, y1: b.y, depth: actorDepth(b), spot: b.spot?.id }));

      for (const p of ordered) {
        // 공·보행기는 지금 위치에 따로 그린다
        const moving = props.get(p.id);
        if (moving && !editingRef.current) {
          const pr = moving.prop;
          const pw = Math.round(wOf(p) * TILE);
          const ph = Math.round(hOf(p) * TILE);
          const src = imageOf(p);
          const img = src ? getSpriteAt(src, pw, ph) : null;
          const flip = pr.flip !== p.flipX;
          // 아이템 그림이 없으면 코드로 그린 공·보행기를 쓴다
          const sp = img ? null : propSprite(pr);
          const left = sp ? sp.left : Math.round(pr.x - pw / 2);
          const top = sp ? sp.top : Math.round(pr.y - ph);
          const w = sp ? sp.width : pw;
          const h = sp ? sp.img.height : ph;
          dynamics.push({
            depth: propDepth(pr),
            rect: { x0: left, y0: top, x1: left + w, y1: top + h },
            draw: () => (sp ? drawFlipped(ctx, sp.img, left, top, w, sp.flip) : drawFlipped(ctx, img!, left, top, w, flip, h)),
          });
          continue;
        }
        const px0 = L.offsetX + p.tileX * TILE;
        const py0 = p.tileY * TILE;
        const pw = Math.round(wOf(p) * TILE);
        const ph = Math.round(hOf(p) * TILE);
        // 창문 밖 하늘 — 모든 창문이 지금 시간대(낮·노을·밤)로 칠해진다. 날씨는 날씨 창문만 따른다(나머지는 맑음).
        const isWindow = p.category === 'WINDOW' || p.dynamicSlot === 'WEATHER';
        const sky: WindowSky = {
          condition: p.dynamicSlot === 'WEATHER' ? (windowSkyRef.current?.condition ?? 'clear') : 'clear',
          phase: skyPhase,
        };
        // 옆으로 놓았으면 옆모습 그림을 쓴다(왼쪽을 보면 flipX 로 뒤집는다)
        const src = imageOf(p);
        const img = !src
          ? null
          : isWindow
            ? getWindowSpriteAt(src, pw, ph, sky, Math.floor(now / 150))
            : getSpriteAt(src, pw, ph);
        const dragging = dragIdRef.current === p.id || selectedRef.current === p.id;
        const shadow = onFloor(p);
        const base = (p.tileY + hOf(p)) * TILE;
        const rect = { x0: px0, y0: py0, x1: px0 + pw, y1: py0 + ph };
        // 이 가구가 아이보다 앞(아랫변이 발보다 아래)에 있고 아이 몸을 덮는가. 앉거나 올라탄 그 가구는 빼고.
        const covers =
          p.category !== 'RUG' && bodies.some((o) => o.spot !== p.id && base > o.depth && overlap(rect, o));
        const alpha0 = fade.get(p.id) ?? 1;
        const alpha = alpha0 + ((covers ? 0.45 : 1) - alpha0) * Math.min(1, dt * 8);
        fade.set(p.id, alpha);
        furniture.push({
          id: p.id,
          base: p.category === 'RUG' ? -Infinity : base,
          rect,
          draw: () => {
            if (shadow) drawItemShadow(ctx, img, px0, py0, pw, ph, p.flipX);
            ctx.globalAlpha = alpha;
            if (img && p.flipX) {
              ctx.save();
              ctx.translate(px0 + pw, py0);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0);
              ctx.restore();
            } else if (img) {
              ctx.drawImage(img, px0, py0);
            } else {
              // 그림이 아직 없거나 못 불러온 가구. 자리는 보여줘야 옮길 수 있다.
              ctx.fillStyle = 'rgba(122,90,54,.35)';
              ctx.fillRect(px0, py0, pw, ph);
            }
            ctx.globalAlpha = 1;
            // 고르거나 옮기는 가구는 흰 테두리로 표시한다(겹쳐 놓아도 된다)
            if (dragging) {
              ctx.strokeStyle = '#FFFBEF';
              ctx.lineWidth = 1;
              ctx.strokeRect(px0 + 0.5, py0 + 0.5, pw - 1, ph - 1);
            }
          },
        });
      }

      // 아이 — 발 위치가 기준점이다
      for (const b of babies) {
        const { img, left, top, width, height, flip } = actorSprite(b);
        // 침대에서 자면 침대 앞 난간을 아기 위에 한 번 더 그려 몸이 침대 안에 들어가 보이게 한다
        const bed = b.inBed && b.spot ? all.find((p) => p.id === b.spot!.id) : null;
        // 의자·미끄럼틀 위에 있으면 그 아이템 바로 위에 그린다
        const seat = b.aboard && b.spot ? all.find((p) => p.id === b.spot!.id) : null;
        const bedSrc = bed ? imageOf(bed) : null;
        const bedImg = bedSrc
          ? getSpriteAt(bedSrc, Math.round(wOf(bed!) * TILE), Math.round(hOf(bed!) * TILE))
          : null;
        dynamics.push({
          depth: actorDepth(b),
          rect: { x0: left, y0: top, x1: left + width, y1: top + height },
          // 자는 아기는 그 침대, 올라탄 아기는 그 의자·미끄럼틀 바로 위에 그린다
          after: bed ? bed.id : seat ? seat.id : undefined,
          draw: () => {
            drawFlipped(ctx, img, left, top, width, flip, height);
            if (!bed || !bedImg) return;
            const bx = L.offsetX + bed.tileX * TILE;
            const by = bed.tileY * TILE;
            const bw = bedImg.width;
            const bh = bedImg.height;
            const front = Math.round(by + bh * BED_FRONT);
            ctx.save();
            ctx.beginPath();
            ctx.rect(bx, front, bw, by + bh - front);
            ctx.clip();
            drawFlipped(ctx, bedImg, bx, by, bw, bed.flipX, bh);
            ctx.restore();
          },
        });
      }

      // 움직이는 것마다 끼워 넣을 자리 — 겹친 뒤쪽 가구는 모두 지난 뒤, 자기를 가리는 가구보다는 앞.
      // 앞쪽 가구가 뒤쪽 가구보다 먼저 놓였으면(뒤 소파·앞 빈백) 앞쪽 가구를 아이 다음으로 미뤄 그린다.
      // 그래야 아이가 뒤 소파에 가려지지 않고, 앞 빈백만 아이를 덮어 흐려진다.
      const insertAt = new Map<number, typeof dynamics>();
      const deferTo = new Map<number, number>();
      for (const d of dynamics) {
        let k = furniture.length;
        if (d.after) {
          const i = furniture.findIndex((f) => f.id === d.after);
          if (i >= 0) k = i + 1;
        } else {
          const first = furniture.findIndex((f) => f.base > d.depth && overlap(f.rect, d.rect));
          if (first >= 0) {
            let lastBehind = -1;
            furniture.forEach((f, i) => {
              if (f.base <= d.depth && overlap(f.rect, d.rect)) lastBehind = i;
            });
            k = Math.max(first, lastBehind + 1);
            furniture.forEach((f, i) => {
              if (i < k && f.base > d.depth && overlap(f.rect, d.rect)) deferTo.set(i, Math.max(deferTo.get(i) ?? 0, k));
            });
          }
        }
        insertAt.set(k, [...(insertAt.get(k) ?? []), d]);
      }
      const deferred = new Map<number, typeof furniture>();
      for (const [i, k] of deferTo) deferred.set(k, [...(deferred.get(k) ?? []), furniture[i]]);
      for (let i = 0; i <= furniture.length; i++) {
        const group = insertAt.get(i);
        if (group) for (const d of group.sort((a, b) => a.depth - b.depth)) d.draw();
        // 아이를 가려야 하는데 먼저 놓였던 앞쪽 가구 — 앞뒤 순서(아랫변)대로
        const late = deferred.get(i);
        if (late) for (const f of late.sort((a, b) => a.base - b.base)) f.draw();
        if (i < furniture.length && !deferTo.has(i)) furniture[i].draw();
      }

      // 보호자 손 — 가구·아기 위에 그린다
      for (const c of carries.values()) drawHands(ctx, c, now);

      // 하트 — 쓰다듬으면 머리 위로 떠오른다
      for (let i = hearts.length - 1; i >= 0; i--) {
        const age = (now - hearts[i].at) / 1000;
        if (age > 1.1) {
          hearts.splice(i, 1);
          continue;
        }
        const hy = Math.round(hearts[i].y - HEAD_TOP - 4 - age * 22);
        const hx = Math.round(hearts[i].x);
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.fillStyle = '#FF7E96';
        ctx.fillRect(hx - 2, hy, 2, 2);
        ctx.fillRect(hx + 1, hy, 2, 2);
        ctx.fillRect(hx - 2, hy + 2, 5, 2);
        ctx.fillRect(hx - 1, hy + 4, 3, 1);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // 옮기던 중에 방이 다시 만들어지면(화면 크기·아이 목록이 바뀌면) 그 자리에 내려놓는다
      for (const c of carries.values()) if (c.actor.held) dropActor(c.actor, performance.now(), world);
    };
  }, [size, kidsKey]);

  /* ---------------- 입력 ---------------- */

  const toNative = (e: React.PointerEvent<HTMLCanvasElement>, L: Layout) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      nx: ((e.clientX - r.left) / r.width) * L.w,
      ny: ((e.clientY - r.top) / r.height) * L.h,
    };
  };

  /**
   * 그 지점에 놓인 가구. 나중에 놓은 것이 위에 있으므로 뒤에서부터 찾는다.
   * 러그는 언제나 맨 아래에 그려지므로 다른 가구를 먼저 찾는다 — 러그를 나중에 옮겼어도 그 위 소파를 집을 수 있게.
   */
  const pickPlacement = (L: Layout, nx: number, ny: number) => {
    const list = placementsRef.current;
    const hit = (p: Placement) => {
      const x0 = L.offsetX + p.tileX * TILE;
      const y0 = p.tileY * TILE;
      return nx >= x0 && nx <= x0 + wOf(p) * TILE && ny >= y0 && ny <= y0 + hOf(p) * TILE;
    };
    for (const rugPass of [false, true]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if ((p.category === 'RUG') === rugPass && hit(p)) return p;
      }
    }
    return null;
  };

  const clearLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    if (!L) return;
    const { nx, ny } = toNative(e, L);

    // 가구를 집는 건 꾸미기 모드에서만. 홈에서 끌리면 실수로 방이 바뀐다.
    const target = editing ? pickPlacement(L, nx, ny) : null;
    if (target) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIdRef.current = target.id;
      setSelectedId(target.id);
      movedRef.current = false;
      // 집은 지점과 가구 왼쪽 위의 차이를 기억해야 손가락으로 순간이동하지 않는다
      dragOffsetRef.current = {
        tx: (nx - (L.offsetX + target.tileX * TILE)) / TILE,
        ty: (ny - target.tileY * TILE) / TILE,
      };
      clearLongPress();
      longPressRef.current = setTimeout(() => {
        if (movedRef.current) return;
        dragIdRef.current = null;
        onLongPressPlacement(target);
      }, 600);
      return;
    }

    if (editing) {
      // 빈 곳을 누르면 선택을 푼다
      setSelectedId(null);
      return;
    }
    // 아기를 누르면 꾹 누를 때 들어 올린다. 짧게 떼면 쓰다듬기(떼는 순간에).
    const baby = babyRef.current?.at(nx, ny);
    if (baby) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const hold = { actor: baby, x: nx, y: ny, picked: false, timer: null as ReturnType<typeof setTimeout> | null };
      hold.timer = setTimeout(() => {
        hold.timer = null;
        hold.picked = true;
        babyRef.current?.pickUp(baby, hold.x, hold.y);
      }, PICK_UP_MS);
      holdRef.current = hold;
      return;
    }
    petRef.current(nx, ny);
    onPet();
  };

  /** 아기 들기를 끝낸다. 들어 올렸으면 내려놓고, 아직이면(짧게 눌렀으면) tap 이 true 일 때 쓰다듬는다. */
  const endHold = (tap: boolean) => {
    const hold = holdRef.current;
    if (!hold) return false;
    holdRef.current = null;
    if (hold.timer) clearTimeout(hold.timer);
    if (hold.picked) babyRef.current?.drop(hold.actor);
    else if (tap) {
      petRef.current(hold.x, hold.y);
      onPet();
    }
    return true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hold = holdRef.current;
    if (hold && layoutRef.current) {
      const { nx, ny } = toNative(e, layoutRef.current);
      if (hold.picked) babyRef.current?.move(hold.actor, nx, ny);
      // 들기 전에 손가락이 움직이면 들기를 그만둔다(쓰다듬지도 않는다)
      else if (Math.hypot(nx - hold.x, ny - hold.y) > 6) endHold(false);
      return;
    }
    const L = layoutRef.current;
    const id = dragIdRef.current;
    if (!L || !id) return;
    const { nx, ny } = toNative(e, L);
    const target = placementsRef.current.find((p) => p.id === id);
    if (!target) return;

    // 반 칸(8px) 격자에 붙인다. 자유 배치로 두면 가구가 미세하게 어긋나 지저분해지고,
    // 한 칸 단위면 러그 가운데에 소파를 딱 맞추지 못하는 경우가 있다. 8px 단위라 픽셀은 쪼개지지 않는다.
    const snap = (v: number) => Math.round(v * 2) / 2;
    const tx = snap((nx - L.offsetX) / TILE - dragOffsetRef.current.tx);
    const ty = snap(ny / TILE - dragOffsetRef.current.ty);
    const clampedX = Math.min(Math.max(tx, minX), maxX - wOf(target));
    const clampedY = Math.min(Math.max(ty, 0), rows - hOf(target));
    if (clampedX === target.tileX && clampedY === target.tileY) return;
    movedRef.current = true;
    clearLongPress();
    // 겹침은 막지 않는다. 포개 놓을지는 꾸미는 사람이 정한다.
    onMovePlacement(id, clampedX, clampedY);
  };

  const handlePointerUp = () => {
    if (endHold(true)) return;
    clearLongPress();
    // 탭은 고르기만 한다(누를 때 이미 골랐다). 방향은 고른 가구 위의 돌리기 버튼으로 바꾼다.
    dragIdRef.current = null;
  };

  const handlePointerCancel = () => {
    if (endHold(false)) return;
    clearLongPress();
    dragIdRef.current = null;
  };

  // 고른 가구 — 돌리기 버튼을 그 위에 띄운다. 화면 밖으로 나간 배치는 그려지는 자리(안으로 당긴 값)를 쓴다.
  const found = editing && selectedId ? placements.find((p) => p.id === selectedId) : null;
  const selected = found ? clampToRoom(found, bounds) : null;

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {/* 방 무대 — 캔버스 크기(방 픽셀 × 배율)를 그대로 쓴다. 화면보다 조금 넓으면 양옆이 잘린다.
          기본 벽지·바닥도 캔버스에 찍으므로 그림을 따로 받을 일이 없다(첫 화면부터 바로 그려진다). */}
      {size && (
        <div
          className="absolute"
          style={{ left: size.left, top: -size.shift, width: size.w * size.scale, height: size.h * size.scale }}
        >
          <canvas
            ref={canvasRef}
            width={size.w * RES}
            height={size.h * RES}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            aria-label={`${kids.map((k) => k.name).join(', ')}의 방`}
            className="absolute inset-0 w-full h-full"
            // 이게 없으면 브라우저가 보간해서 픽셀 아트가 뭉개진다
            style={{ imageRendering: 'pixelated', touchAction: 'manipulation' }}
          />
          {selected && (
            <TransformControls
              left={(size.offsetX + selected.tileX * TILE) * size.scale}
              right={(size.offsetX + selected.tileX * TILE + wOf(selected) * TILE) * size.scale}
              top={selected.tileY * TILE * size.scale}
              bottom={(selected.tileY + hOf(selected)) * TILE * size.scale}
              // 상단 카드·상태바에 가리는 높이면 돌리기 버튼을 가구 아래에 띄운다
              below={selected.tileY * TILE * size.scale - size.shift < 120}
              // 화면 오른쪽 끝(꾸미기 메뉴 쪽)에 붙으면 뒤집기 버튼을 왼쪽에 띄운다
              flipOnLeft={size.left + (size.offsetX + (selected.tileX + wOf(selected)) * TILE) * size.scale > size.viewW - 140}
              canTurn={!!nextTurn(selected)}
              onRotate={() => onRotatePlacement(selected.id)}
              onFlip={() => onFlipPlacement(selected.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** 상태바 높이(CSS px). env() 는 커스텀 속성 값으로 읽으면 풀리지 않을 수 있어 요소 높이로 잰다. */
function measureSafeTop() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;pointer-events:none;height:var(--safe-area-top)';
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

/** 가구를 놓을 수 있는 칸 범위. minX·maxX 는 가로 칸(방 왼쪽 끝이 0), rows 는 세로 칸 수. */
type PlaceBounds = { minX: number; maxX: number; rows: number };

/** 화면 밖으로 나간 배치를 안으로 당긴다. 저장값은 건드리지 않고 그릴 때만 쓴다. */
function clampToRoom(p: Placement, b: PlaceBounds): Placement {
  const tileX = Math.min(Math.max(p.tileX, b.minX), Math.max(b.minX, b.maxX - wOf(p)));
  const tileY = Math.min(Math.max(p.tileY, 0), Math.max(0, b.rows - hOf(p)));
  return tileX === p.tileX && tileY === p.tileY ? p : { ...p, tileX, tileY };
}

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/**
 * 고른 가구의 선택 창에 붙는 버튼 두 개.
 *   위쪽 가운데 — 돌리기(축 회전). 정면 → 옆(오른쪽) → 뒤 → 옆(왼쪽).
 *     옆·뒷모습 그림이 없는 가구도 버튼은 보이되 흐리게 막아 둔다(어드민에서 그림을 올리면 돌아간다).
 *   오른쪽 가운데 — 뒤집기(좌우 반전).
 * left·right·top·bottom 은 방 무대 안의 CSS 좌표(가구 선택 창의 네 변).
 */
function TransformControls({
  left,
  right,
  top,
  bottom,
  below,
  flipOnLeft,
  canTurn,
  onRotate,
  onFlip,
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
  below: boolean;
  flipOnLeft: boolean;
  canTurn: boolean;
  onRotate: () => void;
  onFlip: () => void;
}) {
  const btn = `${BOX} absolute z-10 size-[36px] flex items-center justify-center text-[18px] leading-none text-[#121212] active:translate-y-px`;
  return (
    <>
      <button
        type="button"
        onClick={onRotate}
        disabled={!canTurn}
        aria-label={canTurn ? '가구 방향 돌리기' : '옆모습·뒷모습 그림이 없어 돌릴 수 없는 가구'}
        className={`${btn} disabled:opacity-40 disabled:active:translate-y-0`}
        style={{
          left: (left + right) / 2,
          top: below ? bottom : top,
          transform: below ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
        }}
      >
        <span aria-hidden>↻</span>
      </button>
      <button
        type="button"
        onClick={onFlip}
        aria-label="가구 좌우 뒤집기"
        className={btn}
        style={{
          left: flipOnLeft ? left : right,
          top: (top + bottom) / 2,
          transform: flipOnLeft ? 'translate(calc(-100% - 8px), -50%)' : 'translate(8px, -50%)',
        }}
      >
        <span aria-hidden>⇄</span>
      </button>
    </>
  );
}

/** 좌우 반전이 필요하면 뒤집어서 그린다. h 를 주면 그 크기로 늘려 그린다. */
function drawFlipped(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  left: number,
  top: number,
  width: number,
  flip: boolean,
  height?: number,
) {
  const draw = (x: number, y: number) => (height ? ctx.drawImage(img, x, y, width, height) : ctx.drawImage(img, x, y));
  if (!flip) {
    draw(left, top);
    return;
  }
  ctx.save();
  ctx.translate(left + width, top);
  ctx.scale(-1, 1);
  draw(0, 0);
  ctx.restore();
}
