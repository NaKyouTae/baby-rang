'use client';

import { useEffect, useRef, useState } from 'react';
import { TILE, scaleFor, tilesAcross } from './tiles';
import { MAX_SCALE, getSpriteAt, hOf, preloadSprites, wOf, type Placement } from './placements';
import { DEFAULT_FLOORING, DEFAULT_WALLPAPER, layout, wallBottomOf, warmRoomImages, type Layout } from './scene';
import {
  BED_FRONT,
  HEAD_TOP,
  actorDepth,
  actorSprite,
  createActor,
  createProp,
  petActor,
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
  /** 끌지도 길게 누르지도 않고 뗀 탭. 좌우 반전에 쓴다. */
  onTapPlacement: (id: string) => void;
  /** 크기 배율을 바꾼다. 아랫변 가운데를 기준으로 커지므로 자리도 같이 넘긴다. */
  onResizePlacement: (id: string, scale: number, tileX: number, tileY: number) => void;
  onLongPressPlacement: (placement: Placement) => void;
  onPet: () => void;
  /** 기록을 저장했을 때 아이들이 보여 줄 반응. key 가 바뀔 때마다 한 번 재생한다. */
  reaction?: RoomReaction | null;
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
};
function affordancesOf(p: Placement): Affordance[] {
  if (p.affordances?.length) return p.affordances.map((a) => AFFORDANCE_OF[a]).filter(Boolean);
  return CATEGORY_AFFORDANCE[p.category] ?? [];
}
const isProp = (aff: Affordance[]) => aff.includes('ball') || aff.includes('walker');
/** 방금 놓은 아이템으로 치는 시간 — 이 동안 그 아이템을 쓰는 행동이 2.5배 자주 나온다 */
const NOVEL_MS = 30 * 60 * 1000;

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
    onTapPlacement,
    onResizePlacement,
    onLongPressPlacement,
    onPet,
    reaction,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

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

  // 홈으로 바로 들어온 경우에도 디코딩을 일찍 시작한다(로그인 화면에서 이미 했다면 아무것도 안 한다)
  useEffect(() => warmRoomImages(), []);

  const layoutRef = useRef<Layout | null>(null);
  const petRef = useRef<(nx: number, ny: number) => void>(() => {});
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
    placementsRef.current = placements;
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  const slotsRef = useRef({ wallpaperUrl, flooringUrl });
  useEffect(() => {
    slotsRef.current = { wallpaperUrl, flooringUrl };
    preloadSprites([wallpaperUrl, flooringUrl]);
  }, [wallpaperUrl, flooringUrl]);

  // 화면을 꽉 채우되 픽셀이 균일하도록, 배율을 폭에서 계산하고 크기는 내림한다.
  // 가로는 칸 단위로 잘라 둔다. 폭이 칸으로 나눠떨어지지 않으면 오른쪽에 칸이 안 되는
  // 자투리가 남아 가구가 오른쪽 끝에 못 붙는다. 자투리만큼은 CSS 가 살짝 늘려 채운다.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      const scale = scaleFor(r.width);
      setSize({
        w: tilesAcross(r.width / scale) * TILE,
        h: Math.floor(r.height / scale),
      });
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

    const css = getComputedStyle(document.documentElement);
    const scale = scaleFor(canvas.getBoundingClientRect().width || size.w);
    const safeBottom = (() => {
      const v = parseFloat(css.getPropertyValue('--safe-area-bottom'));
      return Number.isFinite(v) ? Math.round(v / scale) : 0;
    })();

    const L: Layout = layout(size.w, size.h, safeBottom);
    layoutRef.current = L;

    const wallBottom = wallBottomOf(L.h);

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
    reactRef.current = (r) => {
      const now = performance.now();
      for (const b of babies) reactActor(b, r.id, r.variant, now, REACTION_MS);
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
      for (const b of babies) updateActor(b, now, dt, world);

      // 캔버스는 아기 해상도(RES)만큼 촘촘하다. 좌표는 전부 방 픽셀로 쓰고 여기서 한 번 키운다.
      // 방·가구는 칸마다 RES×RES 로 그대로 커지고, 아기 그림만 그 격자를 다 쓴다.
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, L.w, L.h);

      // 기본 벽지·바닥은 캔버스 뒤에 깔린 이미지다. 고른 벽지·바닥재만 캔버스에 덮는다.
      const slots = slotsRef.current;

      // 벽지·바닥재 — 자리가 고정돼 있어 벽/바닥 전체를 타일로 채운다
      const tileFill = (url: string | null, y0: number, y1: number) => {
        // 타일 크기로 미리 줄인 그림을 1:1 로 깐다
        const img = url ? getSpriteAt(url, TILE, TILE) : null;
        if (!img) return;
        for (let ty = y0; ty < y1; ty += TILE) {
          for (let tx = 0; tx < L.w; tx += TILE) ctx.drawImage(img, tx, ty);
        }
      };
      tileFill(slots.wallpaperUrl, 0, wallBottom);
      tileFill(slots.flooringUrl, wallBottom, L.h);

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
      const ordered = [...all.filter((p) => p.category === 'RUG'), ...all.filter((p) => p.category !== 'RUG')];

      for (const p of ordered) {
        // 공·보행기는 지금 위치에 따로 그린다
        const moving = props.get(p.id);
        if (moving && !editingRef.current) {
          const pr = moving.prop;
          const pw = Math.round(wOf(p) * TILE);
          const ph = Math.round(hOf(p) * TILE);
          const img = p.imageUrl ? getSpriteAt(p.imageUrl, pw, ph) : null;
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
        const img = p.imageUrl ? getSpriteAt(p.imageUrl, pw, ph) : null;
        const dragging = dragIdRef.current === p.id || selectedRef.current === p.id;
        furniture.push({
          id: p.id,
          base: p.category === 'RUG' ? -Infinity : (p.tileY + hOf(p)) * TILE,
          rect: { x0: px0, y0: py0, x1: px0 + pw, y1: py0 + ph },
          draw: () => {
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
        const bedImg = bed?.imageUrl
          ? getSpriteAt(bed.imageUrl, Math.round(wOf(bed) * TILE), Math.round(hOf(bed) * TILE))
          : null;
        dynamics.push({
          depth: actorDepth(b),
          rect: { x0: left, y0: top, x1: left + width, y1: top + height },
          // 자는 아기는 그 침대 바로 위에 그린다
          after: bed ? bed.id : undefined,
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

      // 움직이는 것마다 끼워 넣을 자리 — 자기를 가리는 가구 중 가장 먼저 놓인 것 바로 앞
      const insertAt = new Map<number, typeof dynamics>();
      for (const d of dynamics) {
        let k = furniture.length;
        if (d.after) {
          const i = furniture.findIndex((f) => f.id === d.after);
          if (i >= 0) k = i + 1;
        } else {
          const i = furniture.findIndex((f) => f.base > d.depth && overlap(f.rect, d.rect));
          if (i >= 0) k = i;
        }
        insertAt.set(k, [...(insertAt.get(k) ?? []), d]);
      }
      for (let i = 0; i <= furniture.length; i++) {
        const group = insertAt.get(i);
        if (group) for (const d of group.sort((a, b) => a.depth - b.depth)) d.draw();
        if (i < furniture.length) furniture[i].draw();
      }

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
    return () => cancelAnimationFrame(raf);
  }, [size, kidsKey]);

  /* ---------------- 입력 ---------------- */

  const toNative = (e: React.PointerEvent<HTMLCanvasElement>, L: Layout) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      nx: ((e.clientX - r.left) / r.width) * L.w,
      ny: ((e.clientY - r.top) / r.height) * L.h,
    };
  };

  /** 그 지점에 놓인 가구. 나중에 놓은 것이 위에 있으므로 뒤에서부터 찾는다. */
  const pickPlacement = (L: Layout, nx: number, ny: number) => {
    const list = placementsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const x0 = L.offsetX + p.tileX * TILE;
      const y0 = p.tileY * TILE;
      const w = wOf(p) * TILE;
      const h = hOf(p) * TILE;
      if (nx >= x0 && nx <= x0 + w && ny >= y0 && ny <= y0 + h) return p;
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
    petRef.current(nx, ny);
    onPet();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    const id = dragIdRef.current;
    if (!L || !id) return;
    const { nx, ny } = toNative(e, L);
    const target = placementsRef.current.find((p) => p.id === id);
    if (!target) return;

    // 타일 격자에 붙인다. 자유 배치로 두면 가구가 미세하게 어긋나 지저분해진다.
    const tx = Math.round((nx - L.offsetX) / TILE - dragOffsetRef.current.tx);
    const ty = Math.round(ny / TILE - dragOffsetRef.current.ty);
    const clampedX = Math.min(Math.max(tx, 0), tilesAcross(L.w) - wOf(target));
    const clampedY = Math.min(Math.max(ty, 0), Math.floor(L.h / TILE) - hOf(target));
    if (clampedX === target.tileX && clampedY === target.tileY) return;
    movedRef.current = true;
    clearLongPress();
    // 겹침은 막지 않는다. 포개 놓을지는 꾸미는 사람이 정한다.
    onMovePlacement(id, clampedX, clampedY);
  };

  const handlePointerUp = () => {
    clearLongPress();
    // 길게 누르기가 이미 처리됐으면 dragId 가 비어 있어 여기로 오지 않는다
    const tapped = dragIdRef.current && !movedRef.current ? dragIdRef.current : null;
    dragIdRef.current = null;
    if (tapped) onTapPlacement(tapped);
  };

  const handlePointerCancel = () => {
    clearLongPress();
    dragIdRef.current = null;
  };

  /** 배율을 바꾼다. 아랫변 가운데를 붙잡고 커지게 해서 바닥에 놓인 자리가 튀지 않게 한다. */
  // 렌더 중에도 불리므로 layoutRef 가 아닌 size state 로 판단한다 (L.w/L.h 는 size 와 같다)
  const fits = (p: Placement, scale: number) => {
    if (!size) return false;
    return p.tileW * scale <= tilesAcross(size.w) && p.tileH * scale <= Math.floor(size.h / TILE);
  };
  const resizeTo = (p: Placement, scale: number) => {
    const L = layoutRef.current;
    if (!L || scale < 1 || scale > MAX_SCALE || !fits(p, scale)) return;
    const nw = p.tileW * scale;
    const nh = p.tileH * scale;
    const tx = p.tileX + Math.round((wOf(p) - nw) / 2);
    const ty = p.tileY + (hOf(p) - nh);
    onResizePlacement(
      p.id,
      scale,
      Math.min(Math.max(tx, 0), tilesAcross(L.w) - nw),
      Math.min(Math.max(ty, 0), Math.floor(L.h / TILE) - nh),
    );
  };

  const selected = editing && selectedId ? placements.find((p) => p.id === selectedId) ?? null : null;

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {/* 기본 벽지·바닥 — 캔버스 뒤에 원본 해상도로 깐다. 벽지·바닥재를 고르면 캔버스가 그 위를 덮는다.
          방 크기를 재기 전(첫 렌더)부터 그린다. 크기를 잰 뒤에 그리면 그만큼 바닥이 늦게 떠 깜빡인다.
          경계는 재기 전에는 디자인 비율(40%), 잰 뒤에는 캔버스와 같은 픽셀 경계를 쓴다. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0"
        style={{
          height: size ? `${(wallBottomOf(size.h) / size.h) * 100}%` : '40%',
          background: `#EEF0F1 url(${DEFAULT_WALLPAPER}) center / 100% 100% no-repeat`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0"
        style={{
          top: size ? `${(wallBottomOf(size.h) / size.h) * 100}%` : '40%',
          background: `#D8DBDE url(${DEFAULT_FLOORING}) top center / cover no-repeat`,
        }}
      />
      {size && (
        <canvas
          ref={canvasRef}
          width={size.w * RES}
          height={size.h * RES}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label={`${kids.map((k) => k.name).join(', ')}의 방`}
          // relative — 뒤에 깐 기본 벽지·바닥(absolute)보다 위에 그려져야 아이·가구가 보인다
          className="relative w-full h-full"
          // 이게 없으면 브라우저가 보간해서 픽셀 아트가 뭉개진다
          style={{ imageRendering: 'pixelated', touchAction: 'manipulation' }}
        />
      )}
      {size && selected && (
        <ScaleControl
          placement={selected}
          room={size}
          canGrow={(selected.scale ?? 1) < MAX_SCALE && fits(selected, (selected.scale ?? 1) + 1)}
          onChange={(scale) => resizeTo(selected, scale)}
        />
      )}
    </div>
  );
}

const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/**
 * 고른 가구 위에 띄우는 크기 버튼(− 배율 +).
 * 마우스와 터치에서 똑같이 동작해야 해서 핀치 대신 버튼으로 둔다.
 */
function ScaleControl({
  placement: p,
  room,
  canGrow,
  onChange,
}: {
  placement: Placement;
  room: { w: number; h: number };
  canGrow: boolean;
  onChange: (scale: number) => void;
}) {
  const scale = p.scale ?? 1;
  const top = (p.tileY * TILE) / room.h;
  const bottom = ((p.tileY + hOf(p)) * TILE) / room.h;
  const center = ((p.tileX + wOf(p) / 2) * TILE) / room.w;
  // 방 위쪽에 붙은 가구는 버튼이 화면 밖으로 나가므로 아래에 띄운다
  const below = top < 0.12;
  return (
    <div
      className={`${BOX} absolute z-10 flex items-center h-[36px]`}
      style={{
        left: `clamp(64px, ${center * 100}%, calc(100% - 64px))`,
        top: `${(below ? bottom : top) * 100}%`,
        transform: below ? 'translate(-50%, 8px)' : 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <button
        type="button"
        onClick={() => onChange(scale - 1)}
        disabled={scale <= 1}
        aria-label="작게"
        className="w-[40px] h-full flex items-center justify-center text-[18px] text-[#121212] active:translate-y-px disabled:text-[#DFE0E1]"
      >
        −
      </button>
      <span className="min-w-[32px] text-center text-[12px] leading-[1.4] text-[#121212] tabular-nums" aria-live="polite">
        {scale}배
      </span>
      <button
        type="button"
        onClick={() => onChange(scale + 1)}
        disabled={!canGrow}
        aria-label="크게"
        className="w-[40px] h-full flex items-center justify-center text-[18px] text-[#121212] active:translate-y-px disabled:text-[#DFE0E1]"
      >
        +
      </button>
    </div>
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
