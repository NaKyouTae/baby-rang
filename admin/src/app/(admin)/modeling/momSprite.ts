/**
 * 엄마 — 기지 못하는 아기를 포대기로 업어(어부바) 다른 자리로 옮겨 주는 보호자.
 *
 * 아기(babySprite)와 같은 스타듀밸리풍으로 코드에서 원·캡슐을 찍어 그린다.
 * 키는 아기의 두 배 남짓(발에서 머리 끝까지 약 54px)이라 방 타일 3칸 반쯤 된다.
 *   - 앞·뒤·옆(오른쪽) 세 방향. 왼쪽은 옆모습을 반전해서 쓴다.
 *   - 걷기 4프레임(왼발 → 디딤 → 오른발 → 디딤)
 *   - 쪼그려 앉기(squat 0~1) — 아기를 업고 내릴 때. 옆모습만 쓴다.
 *   - baby 를 주면 포대기로 업은 아기를 함께 그린다.
 * 아직 어드민 엄마 모델 화면에서만 쓴다.
 */

import type { Buf, Facing, Gender } from './babySprite';

export const MOM_W = 36;
export const MOM_H = 60;
/** 스프라이트 안의 발 위치(가운데 x, 바닥 y) */
export const MOM_CX = 18;
export const MOM_G = 57;

type P = [number, number];
type Tone = { light: string; dark: string; line: string };

const SKIN: Tone = { light: '#F8C9A2', dark: '#E39B7B', line: '#8E4B3A' };
const HAIR: Tone = { light: '#7A4A2E', dark: '#5E3424', line: '#3A1E17' };
const SHIRT: Tone = { light: '#F7E3A1', dark: '#E2C06E', line: '#8A6A2C' };
const PANTS: Tone = { light: '#7E95C6', dark: '#5C74A8', line: '#2F3F66' };
const SHOE: Tone = { light: '#FDFBF6', dark: '#D9D4CB', line: '#6B6475' };
/** 포대기 — 분홍 바탕에 흰 꽃점 */
const WRAP: Tone = { light: '#F4B6C2', dark: '#DE8EA0', line: '#8A4258' };
const WRAP_DOT = '#FFF6F8';
const EYE = '#2B1A1D';
const BLUSH = '#F28B86';
const LIP = '#C8605C';
/** 업힌 아기 머리카락 — babySprite 머리 그림과 같은 갈색 */
const BABY_HAIR: Tone = { light: '#B98250', dark: '#8A5634', line: '#3A1E17' };
const PACI = '#FFCF3A';

// ───────────────────────── 찍기 ─────────────────────────

function makeBuf(): Buf {
  return { data: new Uint8ClampedArray(MOM_W * MOM_H * 4), w: MOM_W, h: MOM_H, r: 1 };
}

function dot(buf: Buf, x: number, y: number, hex: string) {
  if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return;
  const i = (y * buf.w + x) * 4;
  buf.data[i] = parseInt(hex.slice(1, 3), 16);
  buf.data[i + 1] = parseInt(hex.slice(3, 5), 16);
  buf.data[i + 2] = parseInt(hex.slice(5, 7), 16);
  buf.data[i + 3] = 255;
}

function rect(buf: Buf, x: number, y: number, w: number, h: number, hex: string) {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) dot(buf, xx, yy, hex);
}

function ell(buf: Buf, cx: number, cy: number, rx: number, ry: number, hex: string) {
  if (rx <= 0 || ry <= 0) return;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) dot(buf, x, y, hex);
    }
  }
}

/** 외곽선 → 그늘 → 빛(위·왼쪽으로 살짝 민) 세 번 칠한 타원 */
function blob(buf: Buf, cx: number, cy: number, rx: number, ry: number, t: Tone) {
  ell(buf, cx, cy, rx + 0.9, ry + 0.9, t.line);
  ell(buf, cx, cy, rx, ry, t.dark);
  ell(buf, cx - 0.3, cy - 0.3, rx - 0.5, ry - 0.5, t.light);
}

/** a 에서 b 로 굵기가 ra→rb 로 변하는 캡슐 */
function taper(buf: Buf, a: P, b: P, ra: number, rb: number, hex: string) {
  if (ra <= 0 && rb <= 0) return;
  const r = Math.max(ra, rb);
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const ll = vx * vx + vy * vy || 1e-6;
  for (let y = Math.floor(Math.min(a[1], b[1]) - r - 1); y <= Math.ceil(Math.max(a[1], b[1]) + r + 1); y++) {
    for (let x = Math.floor(Math.min(a[0], b[0]) - r - 1); x <= Math.ceil(Math.max(a[0], b[0]) + r + 1); x++) {
      const qx = x + 0.5 - a[0];
      const qy = y + 0.5 - a[1];
      const t = Math.min(1, Math.max(0, (qx * vx + qy * vy) / ll));
      const dx = qx - vx * t;
      const dy = qy - vy * t;
      const rr = ra + (rb - ra) * t;
      if (rr > 0 && dx * dx + dy * dy <= rr * rr) dot(buf, x, y, hex);
    }
  }
}

/** 여러 마디를 한 덩어리로. 외곽선→그늘→빛 순서로 전체를 칠해야 관절에 금이 안 간다. */
function limb(buf: Buf, pts: P[], rads: number[], t: Tone) {
  const seg = (fn: (a: P, b: P, ra: number, rb: number) => void) => {
    for (let i = 0; i < pts.length - 1; i++) fn(pts[i], pts[i + 1], rads[i], rads[i + 1]);
  };
  seg((a, b, ra, rb) => taper(buf, a, b, ra + 0.9, rb + 0.9, t.line));
  seg((a, b, ra, rb) => taper(buf, a, b, ra, rb, t.dark));
  seg((a, b, ra, rb) => taper(buf, [a[0] - 0.3, a[1] - 0.3], [b[0] - 0.3, b[1] - 0.3], ra - 0.45, rb - 0.45, t.light));
}

/** 2관절 IK — root 에서 target 까지 l1·l2 두 마디로 닿게 하고 관절 위치를 돌려준다. bend 로 무릎 방향을 정한다. */
function knee(root: P, target: P, l1: number, l2: number, bend: 1 | -1): P {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [root[0] + Math.cos(a + bend * A) * l1, root[1] + Math.sin(a + bend * A) * l1];
}

// ───────────────────────── 부위 ─────────────────────────

const THIGH = 8.4;
const SHIN = 8.4;
/** 서 있을 때 엉덩이 높이 */
const HIP_Y = 38;
/** 다 쪼그렸을 때 엉덩이가 내려가는 정도 */
const SQUAT_DROP = 9;

/** 포대기 천 — 흰 꽃점을 드문드문 찍는다 */
function wrapCloth(buf: Buf, cx: number, cy: number, rx: number, ry: number) {
  blob(buf, cx, cy, rx, ry, WRAP);
  for (let y = Math.ceil(cy - ry + 2); y < cy + ry - 1; y += 3) {
    for (let x = Math.ceil(cx - rx + 2 + (y % 2) * 1.5); x < cx + rx - 1; x += 3) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy < 0.6) dot(buf, x, y, WRAP_DOT);
    }
  }
}

/** 포대기 끈 — 몸통을 가로지르는 띠 */
function strap(buf: Buf, x0: number, x1: number, y: number) {
  rect(buf, x0, y - 1, x1 - x0, 3, WRAP.line);
  rect(buf, x0, y, x1 - x0, 1, WRAP.dark);
}

/** 업힌 아기 머리. 앞(얼굴 반쯤)·뒤(뒤통수)·옆(오른쪽을 본다) */
function babyHead(buf: Buf, cx: number, cy: number, view: 'peek' | 'back' | 'side') {
  if (view === 'back') {
    blob(buf, cx, cy, 4.8, 4.6, BABY_HAIR);
    dot(buf, Math.round(cx) - 1, Math.round(cy) - 3, BABY_HAIR.light);
    return;
  }
  blob(buf, cx, cy, 4.6, 4.4, SKIN);
  // 머리카락은 위쪽 절반
  ell(buf, cx, cy - 2.2, 4.9, 2.6, BABY_HAIR.line);
  ell(buf, cx, cy - 2.4, 4.2, 2.0, BABY_HAIR.dark);
  if (view === 'peek') {
    // 엄마 어깨 너머로 오른쪽 눈과 볼만 보인다
    rect(buf, Math.round(cx + 1), Math.round(cy), 1, 2, EYE);
    dot(buf, Math.round(cx + 2), Math.round(cy + 2), BLUSH);
    dot(buf, Math.round(cx + 1), Math.round(cy + 3), PACI);
  } else {
    rect(buf, Math.round(cx + 2), Math.round(cy), 1, 2, EYE);
    dot(buf, Math.round(cx + 2), Math.round(cy + 2), BLUSH);
    rect(buf, Math.round(cx + 3), Math.round(cy + 2), 2, 1, PACI);
  }
}

function babyFoot(buf: Buf, x: number, y: number) {
  blob(buf, x, y, 1.4, 1.2, SKIN);
}

// ───────────────────────── 한 장 ─────────────────────────

export type MomPose = {
  facing: Facing;
  /** 걷기 프레임 0~3. 0·2 는 발을 든 프레임, 1·3 은 디딘 프레임 */
  step: number;
  /** 0 서 있기 ~ 1 다 쪼그려 앉기 */
  squat?: number;
  /** 업은 아기. 없으면 혼자다. */
  baby?: Gender | null;
  blink?: boolean;
};

export function momFrame({ facing, step, squat = 0, baby = null, blink = false }: MomPose): Buf {
  const buf = makeBuf();
  if (facing === 'side') drawSide(buf, step, squat, baby, blink);
  else drawFrontBack(buf, facing === 'down', step, baby, blink);
  return buf;
}

/** 앞(down)·뒤(up). 걸을 때 발을 드는 쪽 다리가 짧아지고 몸이 한 칸 위로 튄다. */
function drawFrontBack(buf: Buf, front: boolean, step: number, baby: Gender | null, blink: boolean) {
  const cx = MOM_CX;
  const lift = step % 2 === 0 ? (step === 0 ? -1 : 1) : 0; // -1 왼발, +1 오른발
  const bob = lift ? -1 : 0;
  const hip = HIP_Y + bob;
  const sh = 25 + bob;

  // 머리 위로 묶은 머리(번)
  blob(buf, cx, 4.5 + bob, 3.2, 2.6, HAIR);

  // 업은 아기 — 앞에서는 오른쪽 어깨 너머로 머리가, 양옆으로 포대기 자락이 살짝 보인다
  if (baby && front) {
    babyHead(buf, cx + 7.8, 17.5 + bob, 'peek');
    ell(buf, cx, 31 + bob, 8, 7.2, WRAP.line);
    ell(buf, cx, 31 + bob, 7.1, 6.3, WRAP.dark);
  }

  // 다리 — 바지. 드는 발은 2px 올라간다.
  for (const side of [-1, 1] as const) {
    const up = lift === side ? 2 : 0;
    const x = cx + side * 2.9;
    limb(buf, [[x, hip], [x + side * 0.2, 53.5 - up]], [2.5, 2.0], PANTS);
  }
  for (const side of [-1, 1] as const) {
    const up = lift === side ? 2 : 0;
    blob(buf, cx + side * 3.1, 55.6 - up, 2.3, 1.3, SHOE);
  }

  // 몸통 — 셔츠. 엉덩이 쪽이 조금 넓다.
  limb(buf, [[cx, sh + 1], [cx, hip - 1]], [5.4, 5.6], SHIRT);
  rect(buf, cx - 5, hip - 1, 10, 1, SHIRT.dark);

  // 팔 — 혼자일 때는 걸음에 맞춰 흔들고, 업었을 때는 뒤로 돌려 아기 엉덩이를 받친다
  for (const side of [-1, 1] as const) {
    const s: P = [cx + side * 5.8, sh + 1.5];
    const swing = lift ? lift * side * (front ? 1 : -1) : 0;
    const hand: P = baby ? [cx + side * 6.6, hip - 1] : [cx + side * 7.0, hip - 1 + swing];
    const elbow: P = baby ? [cx + side * 8.0, sh + 6] : [cx + side * 6.8, sh + 6.5];
    limb(buf, [s, elbow, hand], [1.7, 1.5, 1.4], SKIN);
    limb(buf, [s, [s[0] + side * 0.6, s[1] + 3.2]], [2.2, 2.0], SHIRT);
  }

  if (baby && !front) {
    // 뒤에서는 포대기에 싸인 아기 등이 엄마 등을 거의 다 덮는다
    wrapCloth(buf, cx, 31 + bob, 6.8, 7.4);
    babyHead(buf, cx, 21.5 + bob, 'back');
    babyFoot(buf, cx - 7.6, 36.5 + bob);
    babyFoot(buf, cx + 7.6, 36.5 + bob);
    // 받친 손
    blob(buf, cx - 5.2, 38.4 + bob, 1.4, 1.2, SKIN);
    blob(buf, cx + 5.2, 38.4 + bob, 1.4, 1.2, SKIN);
  }

  // 목·머리
  rect(buf, cx - 1.5, 19 + bob, 3, 4, SKIN.dark);
  blob(buf, cx, 13.5 + bob, 6.6, 6.4, front ? SKIN : HAIR);
  if (front) {
    // 머리카락 — 정수리와 옆머리, 앞머리는 가르마
    ell(buf, cx, 9.5 + bob, 7.4, 4.6, HAIR.line);
    ell(buf, cx, 9.8 + bob, 6.6, 3.9, HAIR.dark);
    ell(buf, cx - 1.5, 9.2 + bob, 3.6, 2.2, HAIR.light);
    rect(buf, cx - 7, 11 + bob, 2, 7, HAIR.dark);
    rect(buf, cx + 5, 11 + bob, 2, 7, HAIR.dark);
    dot(buf, cx - 1, 13 + bob, HAIR.dark);
    dot(buf, cx + 2, 13 + bob, HAIR.dark);
    // 눈·볼·입
    if (blink) {
      rect(buf, cx - 3, 16 + bob, 2, 1, EYE);
      rect(buf, cx + 2, 16 + bob, 2, 1, EYE);
    } else {
      rect(buf, cx - 3, 15 + bob, 1, 2, EYE);
      rect(buf, cx + 3, 15 + bob, 1, 2, EYE);
    }
    dot(buf, cx - 4, 17 + bob, BLUSH);
    dot(buf, cx + 4, 17 + bob, BLUSH);
    rect(buf, cx, 18 + bob, 2, 1, LIP);
  } else {
    ell(buf, cx - 1.6, 11 + bob, 3, 2.4, HAIR.light);
  }

  if (baby && front) {
    // 포대기 끈 — 가슴과 허리에서 앞으로 묶는다
    strap(buf, cx - 5, cx + 6, 27 + bob);
    strap(buf, cx - 5, cx + 6, 34 + bob);
    blob(buf, cx + 0.5, 27.5 + bob, 1.4, 1.2, WRAP);
    // 엄마 허리 양옆으로 나온 아기 발
    babyFoot(buf, cx - 7.6, 37 + bob);
    babyFoot(buf, cx + 7.6, 37 + bob);
  }
}

/**
 * 옆모습(오른쪽을 본다). 걸을 때는 다리가 가위처럼 벌어지고, 쪼그리면 무릎이 앞으로 굽으며 몸이 숙여진다.
 * 업었을 때 아기는 엄마 등(왼쪽)에 포대기로 붙어 있다.
 */
function drawSide(buf: Buf, step: number, squat: number, baby: Gender | null, blink: boolean) {
  const cx = MOM_CX - 1;
  const stride = step === 0 ? 1 : step === 2 ? -1 : 0;
  const bob = stride ? -1 : 0;
  const drop = SQUAT_DROP * squat;
  // 업었거나 쪼그리면 상체를 앞으로 숙인다
  const lean = (baby ? 1.2 : 0) + squat * 2.5;
  const hip: P = [cx - squat * 1.5, HIP_Y + bob + drop];
  const sh: P = [cx + lean, 25 + bob + drop + squat * 1.5];
  const head: P = [sh[0] + 1, 13.5 + bob + drop + squat * 2];

  // 발 위치 — 걸을 때 앞뒤로 벌리고, 쪼그리면 그대로 바닥에 둔다
  const footNear: P = [cx + stride * 4, 54];
  const footFar: P = [cx - stride * 4, 54];

  // 뒷다리(먼 쪽)는 그늘 색으로 먼저
  const farTone: Tone = { light: PANTS.dark, dark: PANTS.dark, line: PANTS.line };
  limb(buf, [hip, knee(hip, footFar, THIGH, SHIN, -1), footFar], [2.4, 2.1, 1.9], farTone);
  blob(buf, footFar[0] + 1, 55.6, 2.4, 1.3, SHOE);

  // 번(뒤통수 쪽)
  blob(buf, head[0] - 5.5, head[1] - 6, 3, 2.6, HAIR);

  // 업은 아기 머리 — 엄마 머리 뒤에서 조금 나온다
  if (baby) babyHead(buf, sh[0] - 8, sh[1] - 2.5, 'side');

  // 몸통
  limb(buf, [[sh[0], sh[1] + 1], [hip[0], hip[1] - 1]], [4.3, 4.6], SHIRT);

  // 앞다리(가까운 쪽)
  limb(buf, [hip, knee(hip, footNear, THIGH, SHIN, -1), footNear], [2.5, 2.2, 2.0], PANTS);
  blob(buf, footNear[0] + 1, 55.6, 2.4, 1.3, SHOE);

  if (baby) {
    // 등에 붙은 포대기와 그 안의 아기. 아기 발은 엄마 허리 앞쪽으로 나온다.
    wrapCloth(buf, sh[0] - 5.6, sh[1] + 7, 5, 6.8);
    babyFoot(buf, hip[0] + 3.6, hip[1] - 2.5);
    strap(buf, sh[0] - 2, sh[0] + 4.5, sh[1] + 3);
    strap(buf, hip[0] - 2, hip[0] + 4.6, hip[1] - 4);
  }

  // 팔 — 혼자일 때는 다리와 반대로 흔들고, 업었을 때는 뒤로 돌려 포대기 밑을 받친다
  const s: P = [sh[0] + 0.5, sh[1] + 1.5];
  const hand: P = baby
    ? [sh[0] - 5, sh[1] + 12.5]
    : squat > 0
      ? [s[0] + 4 + squat * 2, s[1] + 9 - squat * 1]
      : [s[0] - stride * 3, s[1] + 10.5];
  const elbow: P = baby ? [sh[0] + 1.5, sh[1] + 7.5] : [s[0] - stride * 1.2 + squat * 2, s[1] + 5.5];
  limb(buf, [s, elbow, hand], [1.7, 1.5, 1.4], SKIN);
  limb(buf, [s, [s[0] + (elbow[0] - s[0]) * 0.55, s[1] + (elbow[1] - s[1]) * 0.55]], [2.2, 2.0], SHIRT);

  // 목·머리 — 얼굴은 오른쪽, 머리카락이 뒤쪽 절반을 덮는다
  rect(buf, sh[0] - 1, head[1] + 5, 3, 3, SKIN.dark);
  blob(buf, head[0], head[1], 6.3, 6.4, SKIN);
  ell(buf, head[0] - 2.4, head[1] - 2.6, 5.4, 4.6, HAIR.line);
  ell(buf, head[0] - 2.4, head[1] - 2.8, 4.7, 3.9, HAIR.dark);
  ell(buf, head[0] - 3, head[1] - 3.6, 2.6, 1.8, HAIR.light);
  rect(buf, head[0] - 6.5, head[1] - 2, 3, 6, HAIR.dark);
  // 앞머리 — 이마 위로 한 줄
  rect(buf, head[0] + 1, head[1] - 4, 3, 1, HAIR.dark);
  // 귀
  dot(buf, Math.round(head[0] - 1), Math.round(head[1] + 1), SKIN.dark);
  // 눈·볼·입
  const ex = Math.round(head[0] + 3);
  const ey = Math.round(head[1] + 1);
  if (blink) rect(buf, ex, ey + 1, 2, 1, EYE);
  else rect(buf, ex, ey, 1, 2, EYE);
  dot(buf, ex, ey + 3, BLUSH);
  dot(buf, ex + 2, ey + 4, LIP);
}
