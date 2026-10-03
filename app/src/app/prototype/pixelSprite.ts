/**
 * 픽셀 아기 캐릭터 — 톱다운 쿼터뷰 4방향 스프라이트.
 *
 * 톱다운에서는 위로 걸어가면 뒤통수가 보여야 한다. 그래서 down/up/side 세 벌을 만들고
 * 왼쪽은 side 를 좌우 반전해서 쓴다(포켓몬·게더타운이 쓰는 방식).
 *
 * 사람으로 읽히게 하는 순서는 그대로다.
 *   1) 목 — 없으면 머리가 몸에 박힌 덩어리가 된다
 *   2) 옷 — 맨몸이면 팔다리와 몸통이 한 색이라 형태가 안 끊긴다
 *   3) 명암 — 왼쪽 위에서 빛이 온다고 치고 오른쪽 아래에 그늘을 깐다
 *   4) 유색 외곽선 — 검정이 아니라 그 색의 가장 어두운 톤. GBA 포켓몬 화풍의 핵심이다
 */

import { ell, ellO, makeBuf, px, toCanvas, type Buf } from './pixelDraw';

export const SPRITE = 40;
/** 스프라이트 안에서 발이 닿는 y. 방 좌표에 세울 때 기준점이 된다. */
export const GROUND = 35;
const CX = 20;

export const FRAME_COUNT = 8;
/** 픽셀 아트는 8fps 가 제일 자연스럽다. */
export const FRAME_FPS = 8;

export type PixelPose = 'lying' | 'sitting' | 'crawling' | 'standing';
export type Motion = 'idle' | 'walk';
/** side 는 오른쪽을 본 모습. 왼쪽은 렌더러가 좌우 반전해서 쓴다. */
export type Facing = 'down' | 'up' | 'side';

export function poseForMonths(months: number): PixelPose {
  if (months < 4) return 'lying';
  if (months < 8) return 'sitting';
  if (months < 13) return 'crawling';
  return 'standing';
}

export const POSE_LABEL: Record<PixelPose, string> = {
  lying: '누워있기',
  sitting: '앉기',
  crawling: '기기',
  standing: '서기',
};

/** 누워있거나 앉은 아기는 제자리에 있다. 기어다니기 시작해야 방을 돌아다닌다. */
export function canRoam(pose: PixelPose) {
  return pose === 'crawling' || pose === 'standing';
}

/** 제자리에 있는 자세는 방향이 의미 없다. 항상 정면을 본다. */
export function facingFor(pose: PixelPose, facing: Facing): Facing {
  return canRoam(pose) ? facing : 'down';
}

const C = {
  skin: '#FAD4AE',
  skinDark: '#E0AE84',
  skinLine: '#99613D',
  hair: '#5A3C28',
  hairHi: '#7A5438',
  hairLine: '#3A2416',
  suit: '#7CC4F0',
  suitDark: '#5A9ECC',
  suitLine: '#2F6A96',
  sock: '#FFFFFF',
  sockDark: '#D4DEEA',
  sockLine: '#8C9AAC',
  iris: '#3A2618',
  pupil: '#1E1410',
  white: '#FFFFFF',
  cheek: '#F58C8C',
  mouth: '#C2543F',
} as const;

const SHADOW = '#7A6246';

type Metrics = ReturnType<typeof metrics>;

function metrics(months: number) {
  const t = Math.min(Math.max(months / 36, 0), 1);
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    headR: lerp(7.2, 6.1),
    neck: lerp(1.2, 1.8),
    bodyW: lerp(5.1, 4.8),
    bodyH: lerp(5.5, 7.4),
    limb: lerp(5.0, 9.3),
  };
}

/**
 * 명암 있는 타원. 빛은 왼쪽 위에서 온다.
 * 어두운 색으로 채우고 밝은 색을 왼쪽 위로 밀어 덮으면 오른쪽 아래에만 그늘이 남는다.
 */
function vol(buf: Buf, cx: number, cy: number, rx: number, ry: number, light: string, dark: string, line: string) {
  ellO(buf, cx, cy, rx, ry, dark, line);
  ell(buf, cx - 0.7, cy - 0.7, rx - 0.8, ry - 0.8, light);
}

const skinVol = (b: Buf, x: number, y: number, rx: number, ry: number) =>
  vol(b, x, y, rx, ry, C.skin, C.skinDark, C.skinLine);
const suitVol = (b: Buf, x: number, y: number, rx: number, ry: number) =>
  vol(b, x, y, rx, ry, C.suit, C.suitDark, C.suitLine);
const sockVol = (b: Buf, x: number, y: number, rx: number, ry: number) =>
  vol(b, x, y, rx, ry, C.sock, C.sockDark, C.sockLine);

/** 머리카락. facing 에 따라 덮는 범위가 달라진다 — 뒤통수는 전부 머리카락이다. */
function hair(buf: Buf, cx: number, cy: number, r: number, facing: Facing) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const nx = (x + 0.5 - cx) / (r + 0.9);
      const ny = (y + 0.5 - cy) / (r * 0.92 + 0.9);
      if (nx * nx + ny * ny > 1) continue;

      let covered: boolean;
      if (facing === 'up') {
        // 뒤통수 — 아래쪽 목덜미만 남기고 전부 덮는다
        covered = y < cy + r * 0.55;
      } else if (facing === 'side') {
        // 옆모습 — 뒤쪽(왼쪽) 2/3 과 정수리를 덮고 얼굴 쪽만 비운다
        covered = x < cx + r * 0.18 || y < cy - r * 0.5;
      } else {
        const cap = y < cy - r * 0.56;
        const side = Math.abs(x + 0.5 - cx) > r * 0.78 && y < cy - r * 0.06;
        covered = cap || side;
      }
      if (!covered) continue;

      const lit = x < cx - r * 0.1 && y < cy - r * 0.62;
      px(buf, x, y, lit ? C.hairHi : C.hair);
    }
  }
  // 외곽선 — 머리카락 가장자리를 한 톤 더 어둡게 눌러준다
  for (let a = 0; a < 64; a++) {
    const th = (a / 64) * Math.PI * 2;
    px(buf, cx + Math.cos(th) * (r + 0.6), cy + Math.sin(th) * (r * 0.92 + 0.6), C.hairLine, 120);
  }
}

function eye(buf: Buf, x: number, y: number, blink: boolean) {
  if (blink) {
    for (let d = -1; d <= 1; d++) px(buf, x + d, y, C.iris);
    return;
  }
  ell(buf, x, y, 1.4, 1.8, C.iris);
  ell(buf, x, y + 0.4, 1.0, 1.2, C.pupil);
  px(buf, x - 0.6, y - 0.9, C.white);
}

function head(buf: Buf, cx: number, cy: number, m: Metrics, blink: boolean, facing: Facing) {
  // 귀는 머리보다 먼저 그린다. 나중에 그리면 혹처럼 튀어나온다.
  if (facing === 'side') {
    skinVol(buf, cx - m.headR * 0.5, cy + 1, 1.0, 1.3);
  } else {
    for (const s of [-1, 1] as const) skinVol(buf, cx + s * (m.headR * 0.93), cy + 1, 1.0, 1.3);
  }
  skinVol(buf, cx, cy, m.headR, m.headR * 0.92);
  hair(buf, cx, cy, m.headR, facing);

  if (facing === 'up') return; // 뒤통수에는 얼굴이 없다

  const ey = cy + m.headR * 0.3;
  if (facing === 'side') {
    const x = cx + m.headR * 0.42;
    eye(buf, x, ey, blink);
    ell(buf, cx + m.headR * 0.2, ey + 1.2, 1.1, 0.7, C.cheek, 165);
    // 옆모습은 코 실루엣이 하나 있어야 방향이 읽힌다
    px(buf, cx + m.headR * 0.86, ey + 0.6, C.skinDark);
    px(buf, cx + m.headR * 0.72, ey + 2.6, C.mouth);
    return;
  }

  const ex = m.headR * 0.4;
  for (const s of [-1, 1] as const) eye(buf, cx + s * ex, ey, blink);
  for (const s of [-1, 1] as const) {
    ell(buf, cx + s * (m.headR * 0.72), ey + 0.6, 1.1, 0.7, C.cheek, 165);
  }
  px(buf, cx, ey + 1.7, C.skinDark);
  px(buf, cx - 0.5, ey + 2.9, C.mouth);
  px(buf, cx + 0.5, ey + 2.9, C.mouth);
}

function neck(buf: Buf, cx: number, y: number, m: Metrics) {
  ellO(buf, cx, y, 1.8, m.neck, C.skin, C.skinLine);
  ell(buf, cx, y + m.neck * 0.5, 1.5, 0.6, C.skinDark);
}

function floorShadow(buf: Buf, cx: number, rx: number) {
  ell(buf, cx, GROUND + 1.8, rx, 1.6, SHADOW, 60);
}

function drawStanding(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean, step: number, facing: Facing) {
  const footY = GROUND;
  const hipY = footY - m.limb;
  const bodyCy = hipY - m.bodyH * 0.5 + bob;
  const shoulderY = bodyCy - m.bodyH * 0.62;
  const headCy = shoulderY - m.neck - m.headR * 0.85;
  // 옆모습은 몸이 얇다. 이게 없으면 돌아선 게 아니라 그냥 정면으로 보인다.
  const bw = facing === 'side' ? m.bodyW * 0.68 : m.bodyW;

  floorShadow(buf, CX, bw + 3.4);

  if (facing === 'side') {
    // 뒷다리 → 몸통 → 앞다리 순서로 겹쳐야 걷는 깊이가 생긴다
    suitVol(buf, CX - 0.6 - step, (hipY + footY) / 2 - 0.6, 1.5, m.limb / 2 - 0.3);
    sockVol(buf, CX - 0.6 - step * 1.3, footY - 0.6, 2.0, 1.3);
  } else {
    for (const s of [-1, 1] as const) {
      const lx = CX + s * 2.2 + s * step;
      const lift = Math.abs(step) * 0.6;
      suitVol(buf, lx, (hipY + footY) / 2 - 0.6 - lift, 1.7, m.limb / 2 - 0.3);
      sockVol(buf, lx + s * 0.5, footY - 0.6 - lift, 2.2, 1.4);
    }
  }

  suitVol(buf, CX, bodyCy, bw, m.bodyH);
  ell(buf, CX, shoulderY + 0.6, bw * 0.74, 1.3, C.suit);
  ell(buf, CX, bodyCy + m.bodyH * 0.45, bw * 0.82, 1.0, C.suitDark);

  if (facing === 'side') {
    suitVol(buf, CX + 1.2 + step, (hipY + footY) / 2 - 0.6, 1.5, m.limb / 2 - 0.3);
    sockVol(buf, CX + 1.6 + step * 1.3, footY - 0.6, 2.0, 1.3);
    // 팔은 앞쪽 하나만 보인다
    const ay = shoulderY + m.limb * 0.36 + sway;
    suitVol(buf, CX + bw + 0.6, ay, 1.3, m.limb * 0.32 + 1.1);
    skinVol(buf, CX + bw + 0.8, ay + m.limb * 0.32 + 1.5, 1.5, 1.4);
  } else {
    for (const s of [-1, 1] as const) {
      const ax = CX + s * (bw + 1.0);
      const ay = shoulderY + m.limb * 0.36 + s * sway - step * s * 0.6;
      suitVol(buf, ax, ay, 1.3, m.limb * 0.32 + 1.1);
      skinVol(buf, ax + s * 0.3, ay + m.limb * 0.32 + 1.5, 1.5, 1.4);
    }
  }

  neck(buf, CX, shoulderY - m.neck * 0.8, m);
  head(buf, CX, headCy, m, blink, facing);
}

function drawSitting(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean) {
  const hipY = GROUND - 2.4;
  const bodyCy = hipY - m.bodyH * 0.75 + bob;
  const shoulderY = bodyCy - m.bodyH * 0.6;
  const headCy = shoulderY - m.neck - m.headR * 0.85;

  floorShadow(buf, CX, m.bodyW + 7);

  for (const s of [-1, 1] as const) {
    suitVol(buf, CX + s * 4.6, GROUND - 1.6, m.limb * 0.5, 1.7);
    sockVol(buf, CX + s * (4.6 + m.limb * 0.5), GROUND - 1.6, 1.7, 1.5);
  }
  suitVol(buf, CX, bodyCy, m.bodyW, m.bodyH * 0.92);
  ell(buf, CX, shoulderY + 0.6, m.bodyW * 0.74, 1.3, C.suit);
  ell(buf, CX, bodyCy + m.bodyH * 0.42, m.bodyW * 0.82, 1.0, C.suitDark);

  for (const s of [-1, 1] as const) {
    const ax = CX + s * (m.bodyW + 1.0);
    const ay = shoulderY + m.limb * 0.34 + s * sway;
    suitVol(buf, ax, ay, 1.3, m.limb * 0.3 + 1.1);
    skinVol(buf, ax + s * 0.3, ay + m.limb * 0.3 + 1.4, 1.5, 1.4);
  }

  neck(buf, CX, shoulderY - m.neck * 0.8, m);
  head(buf, CX, headCy, m, blink, 'down');
}

/** 옆에서 본 기기 — 오른쪽을 향한다. */
function crawlSide(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean, step: number) {
  const tCx = CX - 5;
  const tRx = m.bodyH * 1.02;
  const tRy = m.bodyW * 0.88;
  const tCy = GROUND - m.limb * 0.68 - tRy + bob;

  floorShadow(buf, CX - 2, tRx + 4.5);

  vol(buf, tCx - tRx * 0.8 - step, GROUND - m.limb * 0.24, 1.2, m.limb * 0.28 + 1.0, C.suitDark, C.suitDark, C.suitLine);
  vol(buf, tCx + tRx * 0.48 + step, GROUND - m.limb * 0.24 - sway, 1.2, m.limb * 0.28 + 1.0, C.suitDark, C.suitDark, C.suitLine);

  suitVol(buf, tCx, tCy, tRx, tRy);
  ell(buf, tCx - tRx * 0.3, tCy + tRy * 0.45, tRx * 0.55, 1.1, C.suitDark);

  const back = { x: tCx - tRx * 0.42 + step, y: GROUND - m.limb * 0.3 + sway };
  suitVol(buf, back.x, back.y, 1.4, m.limb * 0.34 + 1.0);
  skinVol(buf, back.x, GROUND - 0.9, 1.7, 1.4);
  const front = { x: tCx + tRx * 0.86 - step, y: GROUND - m.limb * 0.3 };
  suitVol(buf, front.x, front.y, 1.4, m.limb * 0.34 + 1.0);
  skinVol(buf, front.x, GROUND - 0.9, 1.7, 1.4);

  const hx = tCx + tRx + m.headR * 0.44;
  const hy = tCy - m.headR * 0.95;
  ellO(buf, hx - m.headR * 0.7, hy + m.headR * 0.88, 1.6, m.neck + 0.4, C.skin, C.skinLine);
  head(buf, hx, hy, m, blink, 'side');
}

/**
 * 앞/뒤에서 본 기기. 엎드린 자세라 몸통이 머리 뒤로 거의 가려진다.
 * up 이면 엉덩이와 발바닥이 보이고, down 이면 얼굴과 두 손이 보인다.
 */
function crawlFacing(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean, step: number, facing: 'down' | 'up') {
  const bodyCy = GROUND - m.bodyW * 0.9 + bob;
  const headCy = facing === 'down' ? bodyCy - m.headR * 0.55 : bodyCy - m.headR * 0.75;

  floorShadow(buf, CX, m.bodyW + 5);

  // 양옆으로 벌린 팔다리
  for (const s of [-1, 1] as const) {
    const off = s * step * 0.6;
    suitVol(buf, CX + s * (m.bodyW + 0.8), bodyCy + 1.4 + off, 1.3, m.limb * 0.3 + 1.0);
    skinVol(buf, CX + s * (m.bodyW + 1.0), GROUND - 1.0 + off, 1.6, 1.3);
  }
  suitVol(buf, CX, bodyCy + 1.2, m.bodyW * 1.05, m.bodyW * 0.95);

  if (facing === 'up') {
    // 엉덩이가 위로 솟고 발바닥이 보인다
    ell(buf, CX, bodyCy - 0.5, m.bodyW * 0.8, 1.4, C.suitDark);
    for (const s of [-1, 1] as const) sockVol(buf, CX + s * 2.6, GROUND - 1.2, 1.8, 1.3);
  }
  head(buf, CX, headCy, m, blink, facing);
}

function drawLying(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean) {
  const cy = GROUND - 13;
  ell(buf, CX, cy + 2, m.bodyW + 9, m.bodyH + 5.5, SHADOW, 48);

  for (const s of [-1, 1] as const) {
    suitVol(buf, CX + s * 3.4, cy + m.bodyH + 2.2, 1.6, m.limb * 0.42 + 1.1);
    sockVol(buf, CX + s * 4.6, cy + m.bodyH + m.limb * 0.6 + 2.6, 1.6, 1.4);
  }
  suitVol(buf, CX, cy + bob * 0.5, m.bodyW, m.bodyH);
  ell(buf, CX, cy + m.bodyH * 0.45, m.bodyW * 0.82, 1.0, C.suitDark);

  for (const s of [-1, 1] as const) {
    const ax = CX + s * (m.bodyW + 2.1);
    suitVol(buf, ax, cy - 0.5 + s * sway, m.limb * 0.4 + 1.0, 1.3);
    skinVol(buf, ax + s * (m.limb * 0.4 + 1.4), cy - 0.5 + s * sway, 1.4, 1.5);
  }

  neck(buf, CX, cy - m.bodyH - m.neck * 0.3, m);
  head(buf, CX, cy - m.bodyH - m.neck - m.headR * 0.8 + bob * 0.5, m, blink, 'down');
}

const BOB = [0, 0, -1, -1, 0, 0, 1, 1];
const STEP = [0, 1, 2, 1, 0, -1, -2, -1];

/** (개월수, 자세, 동작, 방향) 한 벌의 프레임을 캔버스로 굽는다. */
export function buildFrames(months: number, pose: PixelPose, motion: Motion, facing: Facing): HTMLCanvasElement[] {
  const m = metrics(months);
  const f = facingFor(pose, facing);

  return Array.from({ length: FRAME_COUNT }, (_, i) => {
    const buf = makeBuf(SPRITE, SPRITE);
    const walking = motion === 'walk';
    const bob = walking ? BOB[(i + 2) % BOB.length] : BOB[i];
    const sway = Math.sin((i / FRAME_COUNT) * Math.PI * 2) * 0.9;
    const step = walking ? STEP[i] : 0;
    const blink = !walking && i === FRAME_COUNT - 1;

    if (pose === 'standing') drawStanding(buf, m, bob, sway, blink, step, f);
    else if (pose === 'sitting') drawSitting(buf, m, bob, sway, blink);
    else if (pose === 'crawling') {
      if (f === 'side') crawlSide(buf, m, bob, sway, blink, step);
      else crawlFacing(buf, m, bob, sway, blink, step, f);
    } else drawLying(buf, m, bob, sway, blink);

    return toCanvas(buf);
  });
}
