/**
 * 보호자 손 — 아직 기지 못하는 아기를 때맞춰 다른 자리로 옮겨 준다.
 *
 * 앱 홈(app/src/app/home/_components/caretaker.ts)과 같은 파일이다. 한쪽을 고치면 다른 쪽에도 그대로 복사한다.
 *
 * 화면 위에서 어른 두 팔이 내려와 아기를 안아 올리고, 옮길 자리까지 데려가 내려놓은 뒤 다시 올라간다.
 * 전신 캐릭터 대신 팔만 그려 좁은 방에서도 가구를 가리지 않는다. 내려놓은 뒤의 행동은 dropActor 가 정한다.
 *   reach 팔이 내려온다 → lift 안아 올린다 → carry 옮긴다 → lower 내려놓는다 → leave 팔이 올라간다
 */

import { dropActor, moveHeldActor, pickUpActor, type Actor, type World } from './babyActor';

type Point = { x: number; y: number };

export type Carry = {
  actor: Actor;
  /** 내려놓을 자리(발 위치) */
  to: Point;
  /** 들어 올린 자리(발 위치) */
  from: Point;
  start: number;
  /** 단계마다 끝나는 시각 */
  t: { reach: number; lift: number; carry: number; lower: number; leave: number };
  /** 팔이 마지막으로 있던 손 위치 — 올라갈 때 쓴다 */
  hand: Point;
};

const REACH_MS = 700;
const LIFT_MS = 300;
const LOWER_MS = 300;
const LEAVE_MS = 600;
/** 안아 올리는 높이(방 픽셀) */
const LIFT = 8;
/** 발에서 손(겨드랑이)까지의 높이 */
const CHEST = 13;
/** 몸 가운데에서 양손까지 */
const HAND_GAP = 7;
/** 화면 위 바깥 — 팔이 여기서 내려온다 */
const OFF_TOP = -24;

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));

export function startCarry(actor: Actor, to: Point, now: number): Carry {
  const dist = Math.hypot(to.x - actor.x, to.y - actor.y);
  const reach = now + REACH_MS;
  const lift = reach + LIFT_MS;
  // 먼 곳일수록 조금 더 오래 걸린다
  const carry = lift + Math.min(2200, 600 + dist * 14);
  const lower = carry + LOWER_MS;
  return {
    actor,
    to,
    from: { x: actor.x, y: actor.y },
    start: now,
    t: { reach, lift, carry, lower, leave: lower + LEAVE_MS },
    hand: { x: actor.x, y: actor.y - CHEST },
  };
}

/** 한 프레임 진행. 다 끝나면(팔까지 올라가면) true. */
export function updateCarry(c: Carry, now: number, world: World) {
  const a = c.actor;
  const { t } = c;
  if (now < t.reach) {
    // 팔이 내려오는 동안 아기는 하던 걸 계속한다. 손은 아기를 따라간다.
    c.from = { x: a.x, y: a.y };
    c.hand = { x: a.x, y: a.y - CHEST };
    return false;
  }
  if (!a.held && now < t.lower) {
    pickUpActor(a);
    moveHeldActor(a, c.from.x, c.from.y);
  }
  if (now < t.lift) {
    const u = ease((now - t.reach) / LIFT_MS);
    moveHeldActor(a, c.from.x, c.from.y - LIFT * u);
  } else if (now < t.carry) {
    const u = ease((now - t.lift) / (t.carry - t.lift));
    // 살짝 흔들리며 옮긴다
    const bob = Math.sin(u * Math.PI * 4) * 0.8;
    moveHeldActor(a, lerp(c.from.x, c.to.x, u), lerp(c.from.y, c.to.y, u) - LIFT + bob);
  } else if (now < t.lower) {
    const u = ease((now - t.carry) / LOWER_MS);
    moveHeldActor(a, c.to.x, c.to.y - LIFT * (1 - u));
  } else if (a.held) {
    moveHeldActor(a, c.to.x, c.to.y);
    dropActor(a, now, world);
  }
  if (now < t.lower) c.hand = { x: a.x, y: a.y - CHEST };
  return now >= t.leave;
}

/** 지금 손 위치. 내려올 때·올라갈 때는 화면 위에서부터 늘어나고 줄어든다. */
function handAt(c: Carry, now: number): Point {
  const { t } = c;
  if (now < t.reach) {
    const u = ease((now - c.start) / REACH_MS);
    return { x: c.hand.x, y: lerp(OFF_TOP, c.hand.y, u) };
  }
  if (now >= t.lower) {
    const u = ease(Math.min(1, (now - t.lower) / LEAVE_MS));
    return { x: c.hand.x, y: lerp(c.hand.y, OFF_TOP, u) };
  }
  return c.hand;
}

const COLOR = { line: '#3B2F2A', sleeve: '#9FB8D9', sleeveShade: '#7F9CC4', cuff: '#FDFDFE', skin: '#F6D3B8', skinShade: '#E8B999' };

/** 두 팔을 그린다 — 화면 위에서 손까지 내려온 소매와 손. 방 픽셀 좌표(1px 단위)로 찍는다. */
export function drawHands(ctx: CanvasRenderingContext2D, c: Carry, now: number) {
  const hand = handAt(c, now);
  const hy = Math.round(hand.y);
  if (hy <= OFF_TOP + 1) return;
  for (const side of [-1, 1]) {
    const cx = Math.round(hand.x + side * HAND_GAP);
    const x0 = cx - 2;
    // 소매(폭 5) — 화면 위에서 손목까지
    const top = OFF_TOP;
    const wrist = hy - 3;
    ctx.fillStyle = COLOR.line;
    ctx.fillRect(x0 - 1, top, 7, wrist - top + 1);
    ctx.fillStyle = COLOR.sleeve;
    ctx.fillRect(x0, top, 5, wrist - top);
    // 몸 바깥쪽 그늘
    ctx.fillStyle = COLOR.sleeveShade;
    ctx.fillRect(side < 0 ? x0 : x0 + 4, top, 1, wrist - top);
    ctx.fillStyle = COLOR.cuff;
    ctx.fillRect(x0, wrist - 2, 5, 2);
    // 손(5×4) — 아기 겨드랑이를 감싼다
    ctx.fillStyle = COLOR.line;
    ctx.fillRect(x0 - 1, wrist, 7, 5);
    ctx.fillStyle = COLOR.skin;
    ctx.fillRect(x0, wrist, 5, 4);
    ctx.fillStyle = COLOR.skinShade;
    ctx.fillRect(x0, wrist + 3, 5, 1);
    // 엄지 — 몸 쪽으로 살짝
    ctx.fillStyle = COLOR.skin;
    ctx.fillRect(side < 0 ? x0 + 5 : x0 - 1, wrist + 1, 1, 2);
  }
}

/**
 * 옮겨 놓을 자리. 지금 있는 곳은 뺀다.
 *   bedOnly — 밤이거나 잠 기록을 저장했을 때. 침대가 없으면 null.
 *   낮 — 러그(놀이매트)를 가장 자주, 침대(낮잠)·빈 바닥을 가끔 고른다.
 */
export function carryTarget(a: Actor, world: World, bedOnly: boolean): Point | null {
  const { bounds } = world;
  const options: { at: Point; w: number }[] = [];
  for (const sp of world.spots) {
    if (sp.id === a.spot?.id) continue;
    const b = sp.box ?? sp;
    if (sp.aff.includes('bed')) {
      options.push({ at: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }, w: 1 });
    } else if (!bedOnly && sp.aff.includes('soft')) {
      const pad = Math.min(8, (sp.x1 - sp.x0) / 2);
      options.push({
        at: {
          x: lerp(sp.x0 + pad, sp.x1 - pad, Math.random()),
          y: clamp(lerp(sp.y0 + 6, sp.y1 - 2, Math.random()), bounds.y0, bounds.y1),
        },
        w: 3,
      });
    }
  }
  if (!bedOnly) {
    // 빈 바닥 — 지금 자리에서 좀 떨어진 곳
    for (let i = 0; i < 6; i++) {
      const at = { x: lerp(bounds.x0, bounds.x1, Math.random()), y: lerp(bounds.y0, bounds.y1, Math.random()) };
      if (Math.hypot(at.x - a.x, at.y - a.y) > 30) {
        options.push({ at, w: 1 });
        break;
      }
    }
  }
  const sum = options.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * sum;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.at;
  }
  return options[options.length - 1]?.at ?? null;
}
