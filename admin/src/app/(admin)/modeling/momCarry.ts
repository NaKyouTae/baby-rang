/**
 * 엄마가 업어 옮기기 — 아직 기지 못하는 아기를 엄마가 포대기로 업어 다른 자리로 옮겨 준다.
 *
 * 방 옆에서 걸어 들어와 아기 옆에 등을 대고 쪼그려 앉아 업고, 일어나 옮길 자리까지 걸어간 뒤
 * 다시 쪼그려 내려놓고 걸어 나간다. 내려놓은 뒤의 행동은 dropActor 가 정한다.
 *   enter 걸어 들어온다 → turn 등을 돌린다 → kneel 쪼그린다 → load 아기를 업는다 → rise 일어난다
 *   → carry 옮긴다 → turn2 → kneel2 → unload 내려놓는다 → rise2 → leave 걸어 나간다
 *
 * 앱 홈(app/src/app/home/_components/momCarry.ts)과 같은 파일이다. 한쪽을 고치면 다른 쪽에도 그대로 복사한다.
 */

import { dropActor, moveHeldActor, pickUpActor, type Actor, type World } from './babyActor';
import type { Facing } from './babySprite';

type Point = { x: number; y: number };
type Phase = 'enter' | 'turn' | 'kneel' | 'load' | 'rise' | 'carry' | 'turn2' | 'kneel2' | 'unload' | 'rise2' | 'leave';

export type MomTrip = {
  actor: Actor;
  phase: Phase;
  /** 이 단계가 시작된 시각 */
  since: number;
  /** 엄마 발 위치 */
  x: number;
  y: number;
  facing: Facing;
  flip: boolean;
  /** 걸은 거리 — 걸음 프레임을 정한다 */
  walked: number;
  /** 지금 걷는 길(침대를 돌아가는 꺾인 점들). 비면 다음 목적지로 새로 잡는다. */
  path: Point[];
  squat: number;
  /** 등에 아기가 있다 */
  loaded: boolean;
  /** 아기 옆 자리, 내려놓을 자리 옆 자리, 나갈 자리 */
  pick: Point;
  drop: Point;
  to: Point;
  exit: Point;
  /** 아기를 집어 올린 자리 */
  from: Point;
  /** 업을 때·내릴 때 아기가 엄마 쪽(-1 왼쪽, 1 오른쪽)에 있다 */
  side: 1 | -1;
};

/** 걷는 속도(방 픽셀/초). 처음 값(26)의 1.8배 — 동작 시간도 같은 비율로 줄였다. */
const WALK = 47;
const TURN_MS = 140;
const KNEEL_MS = 250;
const LOAD_MS = 250;
/** 엄마 발에서 아기 발까지 옆으로 떨어진 거리 */
const BESIDE = 9;
/** 방 밖으로 나가 숨는 거리 */
const OFF = 16;

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));

/** 엄마가 밟고 지나가면 안 되는 가구(침대·붙잡는 가구·의자·미끄럼틀) — 몸 폭만큼 넓힌 상자. 러그·장난감은 밟고 지나간다. */
type Box = { x0: number; x1: number; y0: number; y1: number };
const BODY = 6;
const SOLID = ['bed', 'hold', 'seat', 'slide'];
function obstacles(world: World): Box[] {
  return world.spots
    .filter((sp) => sp.box && sp.aff.some((a) => SOLID.includes(a)))
    .map((sp) => ({ x0: sp.box!.x0 - BODY, x1: sp.box!.x1 + BODY, y0: sp.box!.y0 - 8, y1: sp.box!.y1 + 2 }));
}
const inside = (p: Point, b: Box) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;

/** 선분이 상자 안을 지나가는지 — 몇 군데 찍어 본다 */
function crosses(a: Point, b: Point, box: Box) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
  for (let i = 1; i < n; i++) {
    if (inside({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }, box)) return true;
  }
  return false;
}

/** from 에서 to 까지 침대를 피해 가는 길. 상자 모서리를 하나 또는 둘 거쳐 가장 짧은 쪽을 고른다. */
function route(from: Point, to: Point, world: World): Point[] {
  const box = obstacles(world).find((b) => crosses(from, to, b));
  if (!box) return [to];
  const e = 1;
  const corners = [
    { x: box.x0 - e, y: box.y0 - e },
    { x: box.x1 + e, y: box.y0 - e },
    { x: box.x1 + e, y: box.y1 + e },
    { x: box.x0 - e, y: box.y1 + e },
  ];
  const len = (pts: Point[]) => pts.reduce((s, p, i) => s + Math.hypot(p.x - (i ? pts[i - 1] : from).x, p.y - (i ? pts[i - 1] : from).y), 0);
  const ok = (pts: Point[]) => pts.every((p, i) => !crosses(i ? pts[i - 1] : from, p, box));
  let best: Point[] | null = null;
  for (const c of corners) {
    const one = [c, to];
    if (ok(one) && (!best || len(one) < len(best))) best = one;
    for (const d of corners) {
      if (d === c) continue;
      const two = [c, d, to];
      if (ok(two) && (!best || len(two) < len(best))) best = two;
    }
  }
  return best ?? [to];
}

/** 아기 옆 설 자리. 방 안에 들어오는 쪽을 고르고, 침대 안이면 침대 앞에 선다. */
function besideSpot(p: Point, world: World, prefer: 1 | -1): { at: Point; side: 1 | -1 } {
  const { bounds } = world;
  const bed = world.spots.find((sp) => {
    const b = sp.box ?? sp;
    return sp.aff.includes('bed') && p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
  });
  const y = bed ? (bed.box ?? bed).y1 + 3 : p.y;
  // 엄마가 prefer 쪽에 서면 아기는 반대쪽에 있다
  const boxes = obstacles(world);
  const spot = (sd: number) => ({ x: p.x + sd * BESIDE, y: clamp(y, bounds.y0, bounds.y1 + 2) });
  const bad = (q: Point) => q.x < bounds.x0 - 4 || q.x > bounds.x1 + 4 || boxes.some((b) => inside(q, b));
  let side: 1 | -1 = prefer;
  if (bad(spot(side)) && !bad(spot(-side))) side = (-prefer) as 1 | -1;
  let at = spot(side);
  // 양쪽 다 가구에 걸리면 그 가구 앞에 선다
  const hit = boxes.find((b) => inside(at, b));
  if (hit) at = { x: at.x, y: hit.y1 + 1 };
  return { at, side: (-side) as 1 | -1 };
}

export function startTrip(actor: Actor, to: Point, now: number, world: World, roomW: number): MomTrip {
  // 아기와 가까운 벽 쪽에서 들어와 그쪽으로 나간다
  const enterSide: 1 | -1 = actor.x < roomW / 2 ? -1 : 1;
  const pick = besideSpot({ x: actor.x, y: actor.y }, world, enterSide);
  const drop = besideSpot(to, world, to.x < roomW / 2 ? -1 : 1);
  const exitSide: 1 | -1 = drop.at.x < roomW / 2 ? -1 : 1;
  const start = { x: enterSide < 0 ? -OFF : roomW + OFF, y: pick.at.y };
  return {
    actor,
    phase: 'enter',
    since: now,
    x: start.x,
    y: start.y,
    facing: 'side',
    flip: enterSide > 0,
    walked: 0,
    path: [],
    squat: 0,
    loaded: false,
    pick: pick.at,
    drop: drop.at,
    to,
    exit: { x: exitSide < 0 ? -OFF : roomW + OFF, y: drop.at.y },
    from: { x: actor.x, y: actor.y },
    side: pick.side,
  };
}

/** 이동 방향으로 바라보는 방향. 왼쪽은 옆모습을 반전한다. */
function faceToward(dx: number, dy: number): { facing: Facing; flip: boolean } {
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return { facing: 'side', flip: dx < 0 };
  return { facing: dy > 0 ? 'down' : 'up', flip: false };
}

/** target 까지 침대를 돌아 한 프레임 걷는다. 다 왔으면 true. */
function walk(m: MomTrip, target: Point, dt: number, world: World) {
  const end = m.path[m.path.length - 1];
  if (!end || end.x !== target.x || end.y !== target.y) m.path = route({ x: m.x, y: m.y }, target, world);
  if (step(m, m.path[0], dt)) {
    if (m.path.length === 1) {
      m.path = [];
      return true;
    }
    // 모서리를 돌았으면 남은 길을 다시 잡는다 — 가구가 둘 이상 놓여 있을 수 있다
    m.path = route({ x: m.x, y: m.y }, target, world);
  }
  return false;
}

/** 한 점까지 곧게 한 프레임 걷는다 */
function step(m: MomTrip, target: Point, dt: number) {
  const dx = target.x - m.x;
  const dy = target.y - m.y;
  const d = Math.hypot(dx, dy);
  const stepLen = WALK * dt;
  if (d <= stepLen) {
    m.x = target.x;
    m.y = target.y;
    return true;
  }
  Object.assign(m, faceToward(dx, dy));
  m.x += (dx / d) * stepLen;
  m.y += (dy / d) * stepLen;
  m.walked += stepLen;
  return false;
}

/** 등에 업힌 아기 자리(발 기준) — 아기는 그리지 않지만 위치는 엄마를 따라간다 */
function backOf(m: MomTrip): Point {
  return { x: m.x - (m.flip ? -1 : 1) * 5, y: m.y - 1 };
}

/** 한 프레임 진행. 엄마가 방 밖으로 다 나가면 true. */
export function updateTrip(m: MomTrip, now: number, dt: number, world: World) {
  const a = m.actor;
  const t = now - m.since;
  const next = (phase: Phase) => {
    m.phase = phase;
    m.since = now;
  };
  switch (m.phase) {
    case 'enter':
      // 들어오는 동안 아기가 조금 움직였으면 설 자리를 다시 잡는다
      if (!a.held) {
        m.from = { x: a.x, y: a.y };
        const s = besideSpot(m.from, world, (m.pick.x > a.x ? 1 : -1) as 1 | -1);
        m.pick = s.at;
        m.side = s.side;
      }
      if (walk(m, m.pick, dt, world)) next('turn');
      break;
    case 'turn':
      // 아기에게 등을 돌린다 — 아기가 오른쪽(side 1)이면 왼쪽을 본다
      m.facing = 'side';
      m.flip = m.side > 0;
      if (t >= TURN_MS) {
        pickUpActor(a);
        moveHeldActor(a, m.from.x, m.from.y);
        next('kneel');
      }
      break;
    case 'kneel':
      m.squat = ease(Math.min(1, t / KNEEL_MS));
      if (t >= KNEEL_MS) next('load');
      break;
    case 'load': {
      // 아기가 엄마 등으로 옮겨 간다(안긴 모습으로 잠깐 보인다)
      const u = ease(Math.min(1, t / LOAD_MS));
      const back = backOf(m);
      moveHeldActor(a, m.from.x + (back.x - m.from.x) * u, m.from.y + (back.y - 8 - m.from.y) * u);
      if (t >= LOAD_MS) {
        m.loaded = true;
        next('rise');
      }
      break;
    }
    case 'rise':
      m.squat = 1 - ease(Math.min(1, t / KNEEL_MS));
      if (t >= KNEEL_MS) {
        m.squat = 0;
        next('carry');
      }
      break;
    case 'carry':
      if (walk(m, m.drop, dt, world)) next('turn2');
      break;
    case 'turn2': {
      const s = besideSpot(m.to, world, (m.drop.x > m.to.x ? 1 : -1) as 1 | -1);
      m.side = s.side;
      m.facing = 'side';
      m.flip = m.side > 0;
      if (t >= TURN_MS) next('kneel2');
      break;
    }
    case 'kneel2':
      m.squat = ease(Math.min(1, t / KNEEL_MS));
      if (t >= KNEEL_MS) {
        m.loaded = false;
        next('unload');
      }
      break;
    case 'unload': {
      const u = ease(Math.min(1, t / LOAD_MS));
      const back = backOf(m);
      moveHeldActor(a, back.x + (m.to.x - back.x) * u, back.y - 8 + (m.to.y - back.y + 8) * u);
      if (t >= LOAD_MS) {
        moveHeldActor(a, m.to.x, m.to.y);
        dropActor(a, now, world);
        next('rise2');
      }
      break;
    }
    case 'rise2':
      m.squat = 1 - ease(Math.min(1, t / KNEEL_MS));
      if (t >= KNEEL_MS) {
        m.squat = 0;
        next('leave');
      }
      break;
    case 'leave':
      if (walk(m, m.exit, dt, world)) return true;
      break;
  }
  // 업혀 있는 동안 아기 위치는 엄마 등을 따라간다
  if (m.loaded) {
    const back = backOf(m);
    moveHeldActor(a, back.x, back.y);
  }
  return false;
}

/** 지금 그릴 엄마 자세 */
export function tripPose(m: MomTrip) {
  const moving = m.phase === 'enter' || m.phase === 'carry' || m.phase === 'leave';
  return {
    facing: m.facing,
    flip: m.flip,
    step: moving ? Math.floor(m.walked / 4) % 4 : 1,
    squat: m.squat,
    loaded: m.loaded,
    /** 아기를 그리지 않는다 — 엄마 그림에 업힌 아기가 들어 있다 */
    hideBaby: m.loaded,
  };
}

/** 단계 이름(어드민 표시용) */
export const TRIP_LABEL: Record<Phase, string> = {
  enter: '엄마가 들어오는 중',
  turn: '아기에게 등을 돌리는 중',
  kneel: '쪼그려 앉는 중',
  load: '어부바',
  rise: '업고 일어나는 중',
  carry: '업고 옮기는 중',
  turn2: '내려놓을 자리에 도착',
  kneel2: '쪼그려 앉는 중',
  unload: '내려놓는 중',
  rise2: '일어나는 중',
  leave: '엄마가 나가는 중',
};
