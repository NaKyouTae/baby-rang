/**
 * 방 안의 아기 한 명 — 개월수 가중치와 방에 놓인 아이템으로 행동을 고르고, 몇 초 유지하고, 다음 행동으로 넘어간다.
 *
 * 어드민 모델링 페이지(admin/src/app/(admin)/modeling/babyActor.ts)와 같은 파일이다. 한쪽을 고치면 다른 쪽에도 그대로 복사한다.
 *
 * 행동 점수 = 개월 가중치 × (필요한 아이템이 없으면 0) × (관련 아이템이 있으면 가산) × (새로 놓은 아이템이면 가산)
 *   1) 점수대로 하나 골라 몇 초 유지한다. 같은 행동이 연달아 나오면 한 번 더 뽑는다.
 *   2) 아이템이 필요한 행동은 그 개월의 이동 수단(기기/아장아장/걷기)으로 아이템까지 간 다음 시작한다.
 *   3) 공·보행기는 아기가 움직이면 같이 움직인다. 위치는 화면에서만 바뀌고 저장하지 않는다.
 */

import {
  BALL,
  BEHAVIORS,
  CX,
  G,
  H,
  RES,
  RECORD_FPS,
  W,
  WALKER_H,
  WALKER_W,
  ballSprite,
  behaviorWeights,
  buildFrames,
  buildRecordFrames,
  seatDrop,
  walkerSprite,
  type Affordance,
  type Behavior,
  type BehaviorId,
  type Buf,
  type DiaperVariant,
  type Facing,
  type Gender,
  type RecordId,
} from './babySprite';

/** 아기가 다니는 범위(발 위치 기준). */
export type Bounds = { x0: number; x1: number; y0: number; y1: number };
/**
 * 방에 놓인 아이템의 바닥 자리(발 좌표계). 쓰임새가 붙은 것만 넘긴다.
 * box 는 아이템 그림이 그려지는 칸 전체(잘리지 않은 값) — 침대 매트리스 위치를 잡는 데 쓴다.
 * flip 은 아이템을 좌우 반전해 놓았는지 — 침대 머리 방향이 바뀐다.
 */
export type Spot = {
  id: string;
  aff: Affordance[];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  box?: { x0: number; x1: number; y0: number; y1: number };
  flip?: boolean;
};
/** 움직이는 장난감. 위치는 바닥에 닿는 점(아래 가운데)이다. */
export type Prop = {
  id: string;
  kind: 'ball' | 'walker';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 굴러간 거리 — 공 무늬를 90° 씩 돌리는 데 쓴다 */
  roll: number;
  /** 지금 이 장난감을 쓰는 아기. 쌍둥이가 공 하나를 동시에 차지 않게 한다. */
  heldBy: Actor | null;
  /** 아기 손에 붙어 있어 물리를 멈춘 상태(공 굴리기·보행기) */
  locked: boolean;
  facing: Facing;
  flip: boolean;
};
export type World = {
  bounds: Bounds;
  spots: Spot[];
  props: Prop[];
  /** 방금 놓은 아이템 id — 한동안 그 아이템을 쓰는 행동이 더 자주 나온다 */
  novel: Set<string>;
  /** 밤(저녁 8시~아침 7시)에는 침대에서 자는 일이 훨씬 잦다 */
  night?: boolean;
};

/** 방 픽셀/초. 걸음 박자와 맞춰야 발이 미끄러져 보이지 않는다. */
const SPEED: Partial<Record<BehaviorId, number>> = { crawl: 9, cruise: 7, toddle: 11, walk: 16, run: 30, pushWalker: 9 };
const LOCOMOTION: BehaviorId[] = ['crawl', 'toddle', 'walk'];
const BY_ID = Object.fromEntries(BEHAVIORS.map((b) => [b.id, b])) as Record<BehaviorId, Behavior>;
/** 공을 미는/차는 순간의 프레임과 세기 */
const STRIKE: Partial<Record<BehaviorId, { frame: number; speed: number }>> = {
  ballChase: { frame: 4, speed: 24 },
  ballKick: { frame: 4, speed: 52 },
};
const RECENT_MS = 20000;

const frameCache = new Map<string, HTMLCanvasElement[]>();
const propCache = new Map<string, HTMLCanvasElement>();

function toCanvas(buf: Buf): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = buf.w;
  c.height = buf.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.w, buf.h), 0, 0);
  return c;
}

/** 쌍둥이는 개월수·성별이 같은 경우가 많다. 같은 조합의 프레임은 한 번만 굽는다. */
function framesFor(months: number, gender: Gender, id: BehaviorId, facing: Facing) {
  const key = `${months}:${gender}:${id}:${facing}`;
  let list = frameCache.get(key);
  if (!list) {
    // 방에 놓인 진짜 가구를 잡으므로 스프라이트에 소품을 그리지 않는다
    list = buildFrames(id, months, gender, facing, { noProps: true }).map(toCanvas);
    frameCache.set(key, list);
  }
  return list;
}

/** 이동 방향으로 바라보는 방향을 정한다. 왼쪽은 옆모습을 반전한다. */
function faceToward(dx: number, dy: number, allowed: Facing[]): { facing: Facing; flip: boolean } {
  if (Math.abs(dx) > Math.abs(dy) || !allowed.includes(dy > 0 ? 'down' : 'up')) {
    return { facing: 'side', flip: dx < 0 };
  }
  return { facing: dy > 0 ? 'down' : 'up', flip: false };
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 한 행동을 유지하는 시간(ms). 짧게 끝나는 동작은 몇 번 반복할 만큼만. */
function holdFor(id: BehaviorId) {
  const b = BY_ID[id];
  if (id === 'plop') return (b.frames / b.fps) * 2 * 1000;
  if (id === 'jump') return (b.frames / b.fps) * 3 * 1000;
  if (id === 'ballChase' || id === 'ballKick') return 14000 + Math.random() * 8000;
  if (id === 'sleep') return 20000 + Math.random() * 15000;
  // 미끄럼틀은 한 번 타는 데 몇 초 걸린다 — 서너 번 타고 내려올 시간
  if (id === 'slide') return 15000 + Math.random() * 8000;
  return 8000 + Math.random() * 8000;
}

export interface Actor {
  /** 이 행동만 한다 — 어드민 미리보기 카드용 */
  only?: BehaviorId;
  months: number;
  gender: Gender;
  /** 그 개월에 아이템까지 갈 때 쓰는 이동 행동. 아직 못 움직이는 아기는 null. */
  locomotion: BehaviorId | null;
  act: BehaviorId;
  /** 도착하면 시작할 행동 */
  next: BehaviorId | null;
  traveling: boolean;
  /** 지금 쓰는 아이템 자리(가구·러그·장난감) */
  spot: Spot | null;
  /** 지금 쓰는 장난감(공·보행기) */
  prop: Prop | null;
  /** 공을 찰 방향(+1 오른쪽) */
  strikeDir: number;
  struck: boolean;
  lastItem: { id: string; at: number } | null;
  /** 못 움직이는 아기를 처음 한 번 러그 위에 눕혔는지 */
  settled: boolean;
  /** 침대 안에 누워 있다 — 침대 그림보다 앞에 그려야 한다 */
  inBed: boolean;
  /** 의자·미끄럼틀 위에 올라가 있다 — 그 아이템 그림보다 앞에 그려야 한다 */
  aboard: boolean;
  /** 미끄럼틀을 한 번 타기 시작한 시각 */
  rideStart: number;
  until: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  facing: Facing;
  flip: boolean;
  moving: boolean;
  restUntil: number;
  frame: number;
  frameClock: number;
  /** 기록 반응 중이면 하던 행동을 멈추고 이 애니메이션만 보여 준다 */
  reaction?: { id: RecordId; variant: DiaperVariant; start: number; until: number };
}

export function createActor(months: number, gender: string, x: number, y: number, startAt: number): Actor {
  const ws = behaviorWeights(months);
  const locomotion = ws.filter((w) => LOCOMOTION.includes(w.id)).sort((a, b) => b.w - a.w)[0]?.id ?? null;
  const first = ws.find((w) => !BY_ID[w.id].needs) ?? ws[0];
  return {
    months,
    gender: gender === 'female' ? 'female' : 'male',
    locomotion,
    act: first.id,
    next: null,
    traveling: false,
    spot: null,
    prop: null,
    strikeDir: 1,
    struck: false,
    lastItem: null,
    settled: false,
    inBed: false,
    aboard: false,
    rideStart: 0,
    // 다 같이 한꺼번에 행동을 바꾸면 군무처럼 보인다. 첫 선택을 아이마다 어긋나게 둔다.
    until: startAt,
    x,
    y,
    tx: x,
    ty: y,
    facing: 'down',
    flip: false,
    moving: false,
    restUntil: 0,
    frame: 0,
    frameClock: 0,
  };
}

export function createProp(id: string, kind: Prop['kind'], x: number, y: number): Prop {
  return { id, kind, x, y, vx: 0, vy: 0, roll: 0, heldBy: null, locked: false, facing: 'side', flip: false };
}

/* ------------------------------------------------------------------ 행동 고르기 */

/** 그 쓰임새를 줄 수 있는 아이템들. 공·보행기는 다른 아기가 쓰는 중이면 뺀다. */
function itemsFor(a: Actor, world: World, aff: Affordance): { id: string }[] {
  if (aff === 'ball' || aff === 'walker') {
    return world.props.filter((p) => p.kind === aff && (!p.heldBy || p.heldBy === a));
  }
  return world.spots.filter((s) => s.aff.includes(aff));
}

/** 개월 가중치에 방의 아이템을 곱한 행동 점수(합 1). */
export function scoreBehaviors(a: Actor, world: World, now: number): { id: BehaviorId; w: number }[] {
  const base = a.only ? [{ id: a.only, w: 1 }] : behaviorWeights(a.months);
  const scored = base.map(({ id, w }) => {
    const b = BY_ID[id];
    let score = w;
    let related: { id: string }[] = [];
    if (b.needs) {
      related = itemsFor(a, world, b.needs);
      // 아이템이 없거나, 있어도 거기까지 갈 수 없으면 못 한다. 침대는 못 움직이는 아기도 엄마가 눕혀 준다.
      if (!related.length || (!a.locomotion && b.needs !== 'bed')) return { id, w: 0 };
      if (b.needs === 'bed' && world.night) score *= 4;
    }
    if (b.boost) {
      const boost = itemsFor(a, world, b.boost);
      if (boost.length) {
        score *= 2;
        related = related.concat(boost);
      }
    }
    if (related.some((r) => world.novel.has(r.id))) score *= 2.5;
    if (a.lastItem && now - a.lastItem.at < RECENT_MS && related.some((r) => r.id === a.lastItem!.id)) score *= 0.4;
    return { id, w: score };
  });
  const sum = scored.reduce((t, x) => t + x.w, 0);
  // 할 수 있는 게 하나도 없으면(미리보기에서 아이템을 뺀 경우) 개월 가중치로 돌아간다
  if (sum <= 0) return behaviorWeights(a.months).filter((x) => !BY_ID[x.id].needs);
  return scored.filter((x) => x.w > 0).map((x) => ({ id: x.id, w: x.w / sum }));
}

function pick(ws: { id: BehaviorId; w: number }[]): BehaviorId {
  let r = Math.random();
  for (const x of ws) {
    r -= x.w;
    if (r <= 0) return x.id;
  }
  return ws[ws.length - 1].id;
}

/** 새로 놓은 아이템을 먼저 고른다 */
function preferNovel<T extends { id: string }>(list: T[], world: World): T {
  const fresh = list.filter((x) => world.novel.has(x.id));
  const from = fresh.length ? fresh : list;
  return from[Math.floor(Math.random() * from.length)];
}

function moveTo(a: Actor, x: number, y: number, allowed: Facing[]) {
  a.tx = x;
  a.ty = y;
  a.moving = true;
  ({ facing: a.facing, flip: a.flip } = faceToward(x - a.x, y - a.y, allowed));
}

/** 아이템까지 이동한다. 이동 수단이 없으면 그 자리에 바로 선다. */
function travel(a: Actor, id: BehaviorId, x: number, y: number) {
  a.next = id;
  if (!a.locomotion) {
    a.x = x;
    a.y = y;
    return false;
  }
  a.traveling = true;
  a.act = a.locomotion;
  a.frame = 0;
  moveTo(a, x, y, BY_ID[a.locomotion].facings);
  return true;
}

/**
 * 침대 그림 안에서 매트리스 가운데의 상대 위치. 침대 그림은 칸 가운데에 매트리스가 오도록 그린다.
 * 아기는 이 점을 몸 가운데로 삼아 가로로 눕는다.
 */
const MATTRESS = { x: 0.5, y: 0.5 };
/**
 * 침대 앞 난간이 시작되는 높이(그림 위에서부터 비율). 렌더러가 아기 위에 이 아래만 한 번 더 그려
 * 아기 몸이 침대 안에 들어가 보이게 한다.
 */
export const BED_FRONT = 0.56;

function bedSpot(spot: Spot) {
  const b = spot.box ?? spot;
  return { x: b.x0 + (b.x1 - b.x0) * MATTRESS.x, y: b.y0 + (b.y1 - b.y0) * MATTRESS.y };
}

/**
 * 의자 그림 안에서 앉는 면의 상대 위치. 의자·소파 그림은 대개 칸 아래쪽 절반에 앉는 면이 온다.
 * 아기는 엉덩이를 이 점에 맞춰 앉는다.
 */
const SEAT = { x: 0.5, y: 0.55 };

function seatSpot(spot: Spot) {
  const b = spot.box ?? spot;
  return { x: b.x0 + (b.x1 - b.x0) * SEAT.x, y: b.y0 + (b.y1 - b.y0) * SEAT.y };
}

/**
 * 미끄럼틀 그림 안의 자리(상대 위치). 사다리가 왼쪽, 경사면이 오른쪽 아래로 내려가는 그림을 기준으로 한다.
 * 아이템을 좌우 반전해 놓으면 반대로 탄다.
 *   base 사다리 아래(발 위치) · top 꼭대기 앉는 자리(엉덩이) · end 경사면 끝(발 위치)
 */
const SLIDE = { base: { x: 0.2, y: 1 }, top: { x: 0.26, y: 0.3 }, end: { x: 0.95, y: 0.97 } };
/** 한 번 타기 — 사다리 오르기 · 꼭대기에서 잠깐 · 미끄러지기 · 끝에서 잠깐(초) */
const RIDE = { climb: 1.6, top: 0.5, slide: 0.9, end: 0.5 };
/** 옆으로 앉은 그림에서 발밑과 엉덩이 사이. 꼭대기에서는 엉덩이를 앉는 자리에 맞춘다. */
const RIDE_HIP = 4;

function slidePoint(spot: Spot, at: keyof typeof SLIDE) {
  const b = spot.box ?? spot;
  const w = b.x1 - b.x0;
  const p = SLIDE[at];
  return { x: spot.flip ? b.x1 - w * p.x : b.x0 + w * p.x, y: b.y0 + (b.y1 - b.y0) * p.y };
}

/** 미끄럼틀 위 자리와 자세를 시간에 맞춰 정한다. 한 번 다 타면 true. */
function rideSlide(a: Actor, spot: Spot, now: number) {
  const t = (now - a.rideStart) / 1000;
  const base = slidePoint(spot, 'base');
  const top = slidePoint(spot, 'top');
  const end = slidePoint(spot, 'end');
  if (t < RIDE.climb) {
    // 사다리를 뒷모습으로 오른다. 발이 바닥에서 꼭대기 앉는 자리 높이까지 올라간다.
    const u = t / RIDE.climb;
    a.facing = 'up';
    a.flip = false;
    a.x = base.x + (top.x - base.x) * u;
    a.y = base.y + (top.y + RIDE_HIP - base.y) * u;
    return false;
  }
  a.facing = 'side';
  a.flip = !!spot.flip;
  const s = t - RIDE.climb - RIDE.top;
  // 처음엔 천천히, 갈수록 빨라진다
  const u = s <= 0 ? 0 : Math.min(1, (s / RIDE.slide) ** 2);
  a.x = top.x + (end.x - top.x) * u;
  a.y = top.y + RIDE_HIP + (end.y - top.y - RIDE_HIP) * u;
  return t >= RIDE.climb + RIDE.top + RIDE.slide + RIDE.end;
}

function release(a: Actor) {
  // 자고 일어나면 침대 앞으로 내려온다
  if (a.inBed && a.spot) {
    a.y = a.spot.y1 + 3;
    a.inBed = false;
  }
  // 의자·미끄럼틀에서 내려와 그 앞 바닥에 선다
  if (a.aboard && a.spot) a.y = a.spot.y1 + 3;
  a.aboard = false;
  if (a.prop) {
    a.prop.heldBy = null;
    a.prop.locked = false;
  }
  a.prop = null;
  a.spot = null;
}

/** 공에 다가갈 자리 — 공을 방 가운데 쪽으로 차도록 반대편에 선다 */
function ballApproach(a: Actor, ball: Prop, world: World) {
  const mid = (world.bounds.x0 + world.bounds.x1) / 2;
  a.strikeDir = ball.x < mid ? 1 : -1;
  return { x: clamp(ball.x - a.strikeDir * 8, world.bounds.x0, world.bounds.x1), y: ball.y };
}

function begin(a: Actor, id: BehaviorId, now: number) {
  const b = BY_ID[id];
  a.act = id;
  a.next = null;
  a.traveling = false;
  // 공을 다시 쫓아가 차는 동안에는 처음 정한 시간을 그대로 쓴다
  if (a.until <= now) a.until = now + holdFor(id);
  a.frame = 0;
  a.frameClock = 0;
  a.moving = false;
  a.struck = false;
  a.restUntil = now + 400;
  const item = a.prop ?? a.spot;
  if (item) a.lastItem = { id: item.id, at: now };

  if (b.needs === 'bed' && a.spot) {
    // 침대 앞에 도착하면 안으로 들어가 눕는다
    const at = bedSpot(a.spot);
    a.x = at.x;
    a.y = at.y;
    a.inBed = true;
    a.facing = 'down';
    // 머리는 침대 머리판 쪽 — 반전해 놓은 침대면 반대쪽
    a.flip = !!a.spot.flip;
  } else if (b.needs === 'seat' && a.spot) {
    // 의자 앞에 도착하면 올라앉는다
    const at = seatSpot(a.spot);
    a.x = at.x;
    a.y = at.y + seatDrop(a.months);
    a.aboard = true;
    a.facing = 'down';
    a.flip = false;
  } else if (b.needs === 'slide' && a.spot) {
    // 사다리 아래에 도착하면 한 번 타기 시작한다
    a.aboard = true;
    a.rideStart = now;
    rideSlide(a, a.spot, now);
  } else if (b.needs === 'hold') {
    a.facing = 'up';
    a.flip = false;
  } else if (id === 'ballChase' || id === 'ballKick') {
    a.facing = 'side';
    a.flip = a.strikeDir < 0;
  } else if (id === 'ballRoll' && a.prop) {
    a.facing = 'down';
    a.flip = false;
    a.prop.locked = true;
  } else if (id === 'pushWalker' && a.prop) {
    // 보행기 왼쪽 손잡이에서 오른쪽으로 밀기 시작한다
    a.facing = 'side';
    a.flip = false;
    a.prop.locked = true;
  } else if (id === 'toyPlay') {
    a.facing = 'side';
    if (a.spot) a.flip = a.x > (a.spot.x0 + a.spot.x1) / 2;
  } else if (!b.roams) {
    a.facing = b.facings.includes('down') ? 'down' : b.facings[0];
    a.flip = a.facing === 'side' && Math.random() < 0.5;
  }
}

function choose(a: Actor, now: number, world: World) {
  release(a);
  const ws = scoreBehaviors(a, world, now);
  let id = pick(ws);
  if (id === a.act && ws.length > 1) id = pick(ws);
  const b = BY_ID[id];
  const { bounds } = world;
  a.until = 0;

  if (b.needs === 'hold') {
    const spot = preferNovel(itemsFor(a, world, 'hold') as Spot[], world);
    const pad = Math.min(6, (spot.x1 - spot.x0) / 2);
    a.spot = spot;
    if (travel(a, id, rnd(spot.x0 + pad, spot.x1 - pad), spot.y1 + 2)) return;
  } else if (b.needs === 'bed') {
    const spot = preferNovel(itemsFor(a, world, 'bed') as Spot[], world);
    a.spot = spot;
    // 움직일 수 있으면 침대 앞까지 간다. 못 움직이면 바로 눕는다(begin 이 침대 안으로 옮긴다).
    if (a.locomotion && travel(a, id, clamp((spot.x0 + spot.x1) / 2, bounds.x0, bounds.x1), spot.y1 + 3)) return;
  } else if (b.needs === 'seat') {
    const spot = preferNovel(itemsFor(a, world, 'seat') as Spot[], world);
    a.spot = spot;
    if (travel(a, id, clamp(seatSpot(spot).x, bounds.x0, bounds.x1), clamp(spot.y1 + 2, bounds.y0, bounds.y1))) return;
  } else if (b.needs === 'slide') {
    const spot = preferNovel(itemsFor(a, world, 'slide') as Spot[], world);
    const at = slidePoint(spot, 'base');
    a.spot = spot;
    if (travel(a, id, clamp(at.x, bounds.x0, bounds.x1), clamp(at.y + 2, bounds.y0, bounds.y1))) return;
  } else if (b.needs === 'play') {
    // 장난감 옆에 앉아 장난감 쪽을 본다
    const spot = preferNovel(itemsFor(a, world, 'play') as Spot[], world);
    const left = spot.x0 - 9 >= bounds.x0;
    a.spot = spot;
    const x = left ? spot.x0 - 9 : spot.x1 + 9;
    if (travel(a, id, x, clamp(spot.y1 - 1, bounds.y0, bounds.y1))) return;
  } else if (b.needs === 'ball') {
    const ball = preferNovel(itemsFor(a, world, 'ball') as Prop[], world);
    a.prop = ball;
    ball.heldBy = a;
    // 공 굴리기는 공을 다리 사이에 두고 앉는다
    const at = id === 'ballRoll' ? { x: ball.x, y: clamp(ball.y - 6, bounds.y0, bounds.y1) } : ballApproach(a, ball, world);
    if (travel(a, id, at.x, at.y)) return;
  } else if (b.needs === 'walker') {
    const walker = preferNovel(itemsFor(a, world, 'walker') as Prop[], world);
    a.prop = walker;
    walker.heldBy = a;
    // 손잡이 쪽(보행기 왼쪽)으로 가서 오른쪽으로 민다
    if (travel(a, id, clamp(walker.x - 11, bounds.x0, bounds.x1), walker.y)) return;
  } else if (b.boost) {
    const soft = itemsFor(a, world, b.boost) as Spot[];
    if (soft.length) {
      const rug = preferNovel(soft, world);
      a.spot = rug;
      const x = rnd(rug.x0 + 8, rug.x1 - 8);
      const y = clamp(rnd(rug.y0 + 6, rug.y1 - 1), bounds.y0, bounds.y1);
      // 아직 못 움직이는 아기는 처음 한 번만 러그 위에 눕혀 둔다
      if (a.locomotion) {
        if (travel(a, id, x, y)) return;
      } else if (!a.settled) {
        a.x = x;
        a.y = y;
      }
    }
  }
  a.settled = true;
  begin(a, id, now);
}

/* ------------------------------------------------------------------ 진행 */

/** 보행기는 아기 앞에 붙는다 — 앞모습이면 화면 아래, 뒷모습이면 위, 옆모습이면 진행 방향 */
function walkerOffset(a: Actor) {
  if (a.facing === 'down') return { x: 0, y: 6 };
  if (a.facing === 'up') return { x: 0, y: -7 };
  return { x: a.flip ? -11 : 11, y: 0 };
}

/** 공 물리 — 마찰로 멈추고 방 벽에서 튕긴다. 아기마다 부르기 전에 한 번. */
export function updateWorld(world: World, dt: number) {
  const { bounds } = world;
  for (const p of world.props) {
    if (p.kind !== 'ball' || p.locked) continue;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < 0.5) {
      p.vx = p.vy = 0;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.roll += speed * dt;
    const f = Math.exp(-1.7 * dt);
    p.vx *= f;
    p.vy *= f;
    if (p.x < bounds.x0 || p.x > bounds.x1) {
      p.x = clamp(p.x, bounds.x0, bounds.x1);
      p.vx *= -0.6;
    }
    if (p.y < bounds.y0 || p.y > bounds.y1) {
      p.y = clamp(p.y, bounds.y0, bounds.y1);
      p.vy *= -0.6;
    }
  }
}

/**
 * 기록을 저장하면 아이가 그 기록의 반응을 보여 준다. 하던 행동·쥐고 있던 장난감은 내려놓고
 * 그 자리에 멈춰 ms 동안 반응한 뒤 다시 평소처럼 고른다.
 */
export function reactActor(a: Actor, id: RecordId, variant: DiaperVariant, now: number, ms: number) {
  release(a);
  a.moving = false;
  a.traveling = false;
  a.next = null;
  a.reaction = { id, variant, start: now, until: now + ms };
  a.frame = 0;
  a.frameClock = 0;
}

/**
 * 반응 프레임 번호. 행동(12장)을 두 번 보여 주고 기뻐하기(4장)로 끝낸 뒤 마지막 장에 머문다.
 * 수면은 행동 구분 없이 16장을 계속 돈다.
 */
function reactionFrame(r: NonNullable<Actor['reaction']>, now: number) {
  const f = Math.floor(((now - r.start) / 1000) * RECORD_FPS);
  if (r.id === 'sleep') return f % 16;
  return f < 24 ? f % 12 : 12 + Math.min(3, f - 24);
}

/** 한 프레임 진행. 아이템 목록은 꾸미기로 바뀔 수 있어 매번 받는다. */
export function updateActor(a: Actor, now: number, dt: number, world: World) {
  const { bounds } = world;
  if (a.reaction) {
    if (now < a.reaction.until) {
      a.frame = reactionFrame(a.reaction, now);
      return;
    }
    // 반응이 끝나면 바로 새 행동을 고른다
    a.reaction = undefined;
    a.frame = 0;
    a.until = 0;
  }
  // 쓰던 아이템이 방에서 치워졌으면 하던 일을 그만둔다
  if (a.spot && !world.spots.some((s) => s.id === a.spot!.id)) {
    a.spot = null;
    a.inBed = false;
    a.aboard = false;
    a.until = 0;
    if (a.traveling) a.next = null;
  }
  if (a.prop && !world.props.includes(a.prop)) {
    // 꾸미기 등으로 잠깐 빠진 장난감 — 다시 나타났을 때 아무도 못 쓰는 일이 없게 손을 뗀다
    a.prop.heldBy = null;
    a.prop.locked = false;
    a.prop = null;
    a.until = 0;
    if (a.traveling) a.next = null;
  }

  // 굴러가는 공을 쫓아갈 때는 목표를 계속 고친다
  if (a.traveling && a.prop?.kind === 'ball' && a.next !== 'ballRoll') {
    const at = ballApproach(a, a.prop, world);
    a.tx = at.x;
    a.ty = at.y;
  }

  const b = BY_ID[a.act];
  if (a.moving) {
    const dx = a.tx - a.x;
    const dy = a.ty - a.y;
    const d = Math.hypot(dx, dy);
    const step = (SPEED[a.act] ?? 10) * dt;
    if (d <= step) {
      a.x = a.tx;
      a.y = a.ty;
      a.moving = false;
      if (a.traveling) {
        if (a.next) begin(a, a.next, now);
        else a.traveling = false;
      } else {
        a.restUntil = now + 1400 + Math.random() * 3200;
      }
    } else {
      a.x += (dx / d) * step;
      a.y += (dy / d) * step;
      // 잡고 걷기는 가구를 마주 본 채 게걸음이라 방향을 바꾸지 않는다
      if (a.traveling || (b.roams && a.act !== 'cruise')) {
        ({ facing: a.facing, flip: a.flip } = faceToward(dx, dy, BY_ID[a.act].facings));
      }
    }
  } else if (!a.traveling && b.roams && now >= a.restUntil && now < a.until) {
    if (a.act === 'cruise' && a.spot) {
      const pad = Math.min(6, (a.spot.x1 - a.spot.x0) / 2);
      moveTo(a, rnd(a.spot.x0 + pad, a.spot.x1 - pad), a.y, ['up']);
      a.facing = 'up';
      a.flip = false;
    } else {
      // 보행기를 밀 때는 보행기가 방 밖으로 나가지 않게 안쪽으로만 다닌다
      const m = a.act === 'pushWalker' ? 12 : 0;
      moveTo(a, rnd(bounds.x0 + m, bounds.x1 - m), rnd(bounds.y0 + m * 0.6, bounds.y1 - m * 0.6), b.facings);
    }
  }

  // 미끄럼틀 — 한 번 다 타면 시간이 남았을 때 다시 사다리로 간다
  if (a.act === 'slide' && a.aboard && a.spot && !a.traveling) {
    const spot = a.spot;
    if (rideSlide(a, spot, now)) {
      a.aboard = false;
      if (now < a.until) {
        const at = slidePoint(spot, 'base');
        if (!travel(a, 'slide', clamp(at.x, bounds.x0, bounds.x1), clamp(at.y + 2, bounds.y0, bounds.y1))) begin(a, 'slide', now);
      }
    }
  }

  // 공 차기·밀기 — 한 번 차고 나면 공이 굴러간 곳으로 다시 쫓아간다
  const strike = STRIKE[a.act];
  if (strike && a.prop && !a.traveling) {
    if (!a.struck && a.frame >= strike.frame) {
      a.struck = true;
      a.prop.vx = a.strikeDir * strike.speed;
      a.prop.vy = rnd(-0.35, 0.35) * strike.speed;
    }
    if (a.frame >= BY_ID[a.act].frames && now < a.until) {
      const at = ballApproach(a, a.prop, world);
      // 차는 행동 시간은 유지한 채 다시 다가간다
      const id = a.act;
      if (!travel(a, id, at.x, at.y)) begin(a, id, now);
    }
  }

  // 손에 붙은 장난감
  if (a.prop?.locked) {
    if (a.act === 'ballRoll') {
      const ph = (a.frame / BY_ID.ballRoll.frames) * Math.PI * 2;
      a.prop.x = a.x;
      a.prop.y = a.y + 5 + 2 * (0.5 - 0.5 * Math.cos(ph));
    } else if (a.act === 'pushWalker') {
      const o = walkerOffset(a);
      a.prop.x = a.x + o.x;
      a.prop.y = a.y + o.y;
      a.prop.facing = a.facing;
      a.prop.flip = a.flip;
    }
  }

  if (!a.traveling && !a.moving && now >= a.until) choose(a, now, world);

  // 돌아다니는 행동은 쉬는 동안 첫 프레임에 멈춰 선다
  const cur = BY_ID[a.act];
  if (a.moving || !(cur.roams || a.traveling)) {
    a.frameClock += dt;
    const per = 1 / cur.fps;
    while (a.frameClock >= per) {
      a.frameClock -= per;
      a.frame++;
    }
    // 차는 동작은 한 번만 재생하고 마지막 프레임에서 멈춘다
    if (STRIKE[a.act]) a.frame = Math.min(a.frame, cur.frames);
  } else {
    a.frame = 0;
    a.frameClock = 0;
  }
}

/** 쓰다듬으면 하던 걸 멈추고 잠깐 이쪽을 본다. */
export function petActor(a: Actor, now: number) {
  if (a.moving && !a.traveling) {
    a.moving = false;
    a.restUntil = now + 1800;
  }
  a.until = Math.max(a.until, now + 1800);
}

/** 그림을 90° 반시계로 돌린다. 픽셀이 정확히 맞물려 뭉개지지 않는다. */
function rotateLeft(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.height;
  c.height = src.width;
  const ctx = c.getContext('2d')!;
  ctx.translate(0, src.width);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

function mirror(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/** 돌린 그림 위에 Z 를 똑바로 세워 그린다. 머리 위로 떠오르며 흐려진다. */
function withSnore(c: HTMLCanvasElement, t0: number, headRight: boolean) {
  const ctx = c.getContext('2d')!;
  const Z = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]];
  for (const [off, alpha] of [[0, 1], [0.5, 0.6]]) {
    const t = (t0 + off) % 1;
    ctx.fillStyle = `rgba(110,127,168,${(alpha * (1 - t)).toFixed(2)})`;
    // 좌표는 논리 픽셀로 정하고 아기 해상도(RES)만큼 키워 찍는다
    const x = headRight ? Math.round(c.width / RES - 17 - t * 3) : Math.round(14 + t * 3);
    const y = Math.round(10 - t * 7);
    for (const [dx, dy] of Z) ctx.fillRect((x + dx) * RES, (y + dy) * RES, RES, RES);
  }
  return c;
}

/** 누운 그림에서 몸 가운데(배꼽 근처). 침대에서는 이 점을 매트리스 가운데에 맞춘다. */
const LYING_CENTER = { x: CX, y: G - 19 };

/** 지금 그릴 프레임과 위치. 발 위치가 기준점이다. 그림은 RES 배 크기라 width·height(논리 크기)로 줄여 그린다. */
export function actorSprite(a: Actor) {
  if (a.reaction) {
    const { id, variant } = a.reaction;
    const key = `${a.months}:${a.gender}:record:${id}:${variant}`;
    let list = frameCache.get(key);
    if (!list) {
      list = buildRecordFrames(id, a.months, a.gender, variant).map(toCanvas);
      frameCache.set(key, list);
    }
    return { img: list[a.frame % list.length], left: snap(a.x) - CX, top: snap(a.y) - G, width: W, height: H, flip: false };
  }
  if (a.act === 'sleep' && a.inBed) {
    // 침대에서는 머리를 왼쪽(머리판)으로 두고 가로로 눕는다
    // 반전한 침대면 머리가 오른쪽. Z 글자까지 뒤집히지 않게 반전을 미리 구워 둔다.
    const key = `${a.months}:${a.gender}:sleep:rot:${a.flip}`;
    let rot = frameCache.get(key);
    if (!rot) {
      const flat = buildFrames('sleep', a.months, a.gender, 'down', { noProps: true, noSnore: true });
      rot = flat.map((f, i) => {
        const turned = rotateLeft(toCanvas(f));
        return withSnore(a.flip ? mirror(turned) : turned, i / flat.length, a.flip);
      });
      frameCache.set(key, rot);
    }
    const img = rot[a.frame % rot.length];
    // 돌린 그림에서 몸 가운데는 (LYING_CENTER.y, W - LYING_CENTER.x). 돌린 그림의 논리 크기는 H×W 다.
    const cx = a.flip ? H - LYING_CENTER.y : LYING_CENTER.y;
    return {
      img,
      left: snap(a.x - cx),
      top: snap(a.y - (W - LYING_CENTER.x)),
      width: H,
      height: W,
      flip: false,
    };
  }
  const list = framesFor(a.months, a.gender, a.act, a.facing);
  const frame = STRIKE[a.act] ? Math.min(a.frame, list.length - 1) : a.frame % list.length;
  return {
    img: list[frame],
    left: snap(a.x) - CX,
    top: snap(a.y) - G,
    width: W,
    height: H,
    flip: a.flip,
  };
}

/** 아기는 RES 배 촘촘하게 그리므로 위치도 그 격자(1/RES 논리 픽셀)에 맞춰 더 부드럽게 움직인다. */
const snap = (v: number) => Math.round(v * RES) / RES;

/** 코드로 그린 장난감 그림과 위치. 아이템 그림이 없을 때(어드민 미리보기 등) 쓴다. */
export function propSprite(p: Prop) {
  if (p.kind === 'ball') {
    const rot = Math.floor(p.roll / 3) % 4;
    const key = `ball:${rot}`;
    let img = propCache.get(key);
    if (!img) propCache.set(key, (img = toCanvas(ballSprite(rot))));
    return { img, left: Math.round(p.x - BALL / 2), top: Math.round(p.y) - BALL + 1, width: BALL, height: img.height, flip: false };
  }
  const key = `walker:${p.facing}`;
  let img = propCache.get(key);
  if (!img) propCache.set(key, (img = toCanvas(walkerSprite(p.facing))));
  return {
    img,
    left: Math.round(p.x - WALKER_W / 2),
    top: Math.round(p.y) - WALKER_H + 1,
    width: WALKER_W,
    height: WALKER_H,
    flip: p.facing === 'side' && p.flip,
  };
}

/** 아기 그리기 순서용 깊이. 침대 안에서 자거나 의자·미끄럼틀 위에 있으면 그 그림 위에 와야 한다. */
export function actorDepth(a: Actor) {
  return (a.inBed || a.aboard) && a.spot ? (a.spot.box ?? a.spot).y1 + 0.5 : a.y;
}

/** 그리기 순서용 깊이. 옆으로 미는 보행기는 아기와 같은 줄이지만 몸 앞에 와야 한다. */
export function propDepth(p: Prop) {
  return p.kind === 'walker' && p.heldBy && p.facing === 'side' ? p.y + 0.5 : p.y;
}

/** 머리 꼭대기 근처 — 하트를 띄울 높이 */
export const HEAD_TOP = 30;
