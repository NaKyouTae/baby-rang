/**
 * 픽셀 아기 캐릭터 (40x40 스프라이트, 키 25~30px).
 *
 * 스프라이트를 손으로 찍는 대신 도형을 저해상도 격자에 찍어서 만든다.
 * 덕분에 개월수 하나로 머리:몸:팔다리 비율을 바꿀 수 있다.
 *
 * 사람으로 읽히게 하는 건 디테일이 아니라 순서가 있다.
 *   1) 목 — 없으면 머리가 몸에 박힌 덩어리가 된다
 *   2) 옷 — 맨몸이면 팔다리와 몸통이 한 색이라 형태가 안 끊긴다
 *   3) 명암 — 왼쪽 위에서 빛이 온다고 치고 오른쪽 아래에 그늘을 깔면 덩어리가 입체가 된다
 *   4) 흰자 있는 눈과 눈썹 — 이게 들어가야 '생물'로 보인다
 */

import { ell, ellO, makeBuf, px, toCanvas, type Buf } from './pixelDraw';

/** 스프라이트 한 장의 크기. */
export const SPRITE = 40;
/** 스프라이트 안에서 발이 닿는 y. 방 좌표에 세울 때 기준점이 된다. */
export const GROUND = 35;
const CX = 20;

export const FRAME_COUNT = 8;
/** 픽셀 아트는 8fps 가 제일 자연스럽다. 60fps 로 돌리면 미끄러져 보인다. */
export const FRAME_FPS = 8;

export type PixelPose = 'lying' | 'sitting' | 'crawling' | 'standing';
export type Motion = 'idle' | 'walk';

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

const C = {
  skin: '#F9D3AF',
  skinDark: '#E4B188',
  line: '#8A5538',
  hair: '#4A3328',
  hairHi: '#684935',
  suit: '#92C9EA',
  suitDark: '#6BA3CC',
  sock: '#FCFCFE',
  sockDark: '#DCE3EC',
  white: '#FFFFFF',
  iris: '#3E2A1E',
  pupil: '#241812',
  cheek: '#F09A9A',
  mouth: '#B85744',
} as const;

const SHADOW = '#8E7A5F';

type Metrics = ReturnType<typeof metrics>;

/**
 * 개월수별 체형. 신생아는 4두신에 팔다리가 짧고, 36개월로 갈수록
 * 머리 비중이 줄고 팔다리가 길어진다.
 */
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

/** 외곽선만 두른 타원. */
function O(buf: Buf, cx: number, cy: number, rx: number, ry: number, fill: string) {
  ellO(buf, cx, cy, rx, ry, fill, C.line);
}

/**
 * 명암 있는 타원. 빛은 왼쪽 위에서 온다.
 * 어두운 색으로 한 번 채우고 밝은 색을 왼쪽 위로 밀어 덮으면
 * 오른쪽 아래에만 초승달 모양 그늘이 남는다.
 */
function volume(buf: Buf, cx: number, cy: number, rx: number, ry: number, light: string, dark: string) {
  ellO(buf, cx, cy, rx, ry, dark, C.line);
  ell(buf, cx - 0.7, cy - 0.7, rx - 0.8, ry - 0.8, light);
}

/** 머리카락 — 윗부분 캡 + 얼굴 옆 구레나룻 + 왼쪽 위 하이라이트. */
function hair(buf: Buf, cx: number, cy: number, r: number) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const nx = (x + 0.5 - cx) / (r + 0.9);
      const ny = (y + 0.5 - cy) / (r * 0.92 + 0.9);
      if (nx * nx + ny * ny > 1) continue;
      const cap = y < cy - r * 0.56;
      const side = Math.abs(x + 0.5 - cx) > r * 0.78 && y < cy - r * 0.06;
      if (!cap && !side) continue;
      // 정수리 왼쪽 위만 밝게 — 머리가 둥글어 보인다
      const lit = x < cx - r * 0.1 && y < cy - r * 0.62;
      px(buf, x, y, lit ? C.hairHi : C.hair);
    }
  }
  // 앞머리 한 가닥만 이마로 흘러내린다. 많이 내리면 눈을 먹는다.
  px(buf, cx + Math.round(r * 0.22), cy - Math.round(r * 0.5), C.hair);
}

/** 머리통 + 귀 + 머리카락 + 얼굴. */
function head(buf: Buf, cx: number, cy: number, m: Metrics, blink: boolean, shift = 0) {
  // 귀는 머리보다 먼저 그린다. 나중에 그리면 머리 밖으로 튀어나온 혹처럼 보인다.
  for (const s of [-1, 1] as const) {
    O(buf, cx + s * (m.headR * 0.93), cy + 1, 1.2, 1.6, C.skinDark);
  }
  volume(buf, cx, cy, m.headR, m.headR * 0.92, C.skin, C.skinDark);
  hair(buf, cx, cy, m.headR);

  const fx = cx + shift;
  const ex = m.headR * 0.4;
  const ey = cy + m.headR * 0.3;

  // 눈썹은 넣지 않는다. 이 크기에서 눈썹 픽셀은 눈에 붙어 찡그린 얼굴이 된다.
  // 아기 눈은 흰자가 거의 안 보이고 눈동자가 눈을 꽉 채운다 — 그게 순한 인상을 만든다.
  for (const s of [-1, 1] as const) {
    const x = fx + s * ex;
    if (blink) {
      for (let d = -1; d <= 1; d++) px(buf, x + d, ey, C.iris);
      continue;
    }
    ell(buf, x, ey, 1.4, 1.8, C.iris);
    ell(buf, x, ey + 0.4, 1.0, 1.2, C.pupil);
    // 반사광 한 점. 이것만으로 눈이 살아난다.
    px(buf, x - 0.6, ey - 0.9, C.white);
  }

  // 코 — 한 점이면 충분하다
  px(buf, fx, ey + 1.7, C.skinDark);
  // 입 — 두 점이 살짝 올라간 미소. 세 점은 이 크기에서 덩어리가 된다.
  px(buf, fx - 0.5, ey + 2.9, C.mouth);
  px(buf, fx + 0.5, ey + 2.9, C.mouth);

  // 볼터치는 눈 바로 아래 바깥. 입 옆에 두면 수염처럼 보인다.
  for (const s of [-1, 1] as const) {
    ell(buf, fx + s * (m.headR * 0.72), ey + 0.6, 1.1, 0.7, C.cheek, 165);
  }
}

/** 목 — 머리와 몸을 끊어주는 부분. 사람으로 보이게 하는 데 가장 효과가 크다. */
function neck(buf: Buf, cx: number, y: number, m: Metrics) {
  ellO(buf, cx, y, 1.8, m.neck, C.skin, C.line);
  ell(buf, cx, y + m.neck * 0.5, 1.5, 0.6, C.skinDark);
}

function floorShadow(buf: Buf, cx: number, rx: number) {
  ell(buf, cx, GROUND + 1.8, rx, 1.6, SHADOW, 60);
}

function drawStanding(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean, step: number) {
  const footY = GROUND;
  const hipY = footY - m.limb;
  const bodyCy = hipY - m.bodyH * 0.5 + bob;
  const shoulderY = bodyCy - m.bodyH * 0.62;
  const headCy = shoulderY - m.neck - m.headR * 0.85;

  floorShadow(buf, CX, m.bodyW + 3.4);

  // 다리 — 바지까지 한 벌이라 옷 색, 발만 양말 색
  for (const s of [-1, 1] as const) {
    const lx = CX + s * 2.2 + s * step;
    const lift = Math.abs(step) * 0.6;
    volume(buf, lx, (hipY + footY) / 2 - 0.6 - lift, 1.7, m.limb / 2 - 0.3, C.suit, C.suitDark);
    volume(buf, lx + s * 0.5, footY - 0.6 - lift, 2.2, 1.4, C.sock, C.sockDark);
  }

  // 몸통 — 어깨 쪽이 좁아야 머리가 얹힌 것으로 보인다
  volume(buf, CX, bodyCy, m.bodyW, m.bodyH, C.suit, C.suitDark);
  ell(buf, CX, shoulderY + 0.6, m.bodyW * 0.74, 1.3, C.suit);
  ell(buf, CX, bodyCy + m.bodyH * 0.45, m.bodyW * 0.82, 1.0, C.suitDark);

  // 팔 — 어깨에서 내려오고 끝에 맨살 손
  for (const s of [-1, 1] as const) {
    const ax = CX + s * (m.bodyW + 1.0);
    const ay = shoulderY + m.limb * 0.36 + s * sway - step * s * 0.6;
    volume(buf, ax, ay, 1.3, m.limb * 0.32 + 1.1, C.suit, C.suitDark);
    volume(buf, ax + s * 0.3, ay + m.limb * 0.32 + 1.5, 1.5, 1.4, C.skin, C.skinDark);
  }

  neck(buf, CX, shoulderY - m.neck * 0.8, m);
  head(buf, CX, headCy, m, blink);
}

function drawSitting(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean) {
  const hipY = GROUND - 2.4;
  const bodyCy = hipY - m.bodyH * 0.75 + bob;
  const shoulderY = bodyCy - m.bodyH * 0.6;
  const headCy = shoulderY - m.neck - m.headR * 0.85;

  floorShadow(buf, CX, m.bodyW + 7);

  // 다리를 앞/옆으로 뻗고 앉은 자세
  for (const s of [-1, 1] as const) {
    volume(buf, CX + s * 4.6, GROUND - 1.6, m.limb * 0.5, 1.7, C.suit, C.suitDark);
    volume(buf, CX + s * (4.6 + m.limb * 0.5), GROUND - 1.6, 1.7, 1.5, C.sock, C.sockDark);
  }
  volume(buf, CX, bodyCy, m.bodyW, m.bodyH * 0.92, C.suit, C.suitDark);
  ell(buf, CX, shoulderY + 0.6, m.bodyW * 0.74, 1.3, C.suit);
  ell(buf, CX, bodyCy + m.bodyH * 0.42, m.bodyW * 0.82, 1.0, C.suitDark);

  for (const s of [-1, 1] as const) {
    const ax = CX + s * (m.bodyW + 1.0);
    const ay = shoulderY + m.limb * 0.34 + s * sway;
    volume(buf, ax, ay, 1.3, m.limb * 0.3 + 1.1, C.suit, C.suitDark);
    volume(buf, ax + s * 0.3, ay + m.limb * 0.3 + 1.4, 1.5, 1.4, C.skin, C.skinDark);
  }

  neck(buf, CX, shoulderY - m.neck * 0.8, m);
  head(buf, CX, headCy, m, blink);
}

function drawCrawling(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean, step: number) {
  // 오른쪽을 향한 측면 뷰. 왼쪽으로 갈 때는 스프라이트를 좌우 반전해 쓴다.
  const torsoCx = CX - 5;
  const torsoRx = m.bodyH * 1.02;
  const torsoRy = m.bodyW * 0.88;
  const torsoCy = GROUND - m.limb * 0.68 - torsoRy + bob;

  floorShadow(buf, CX - 2, torsoRx + 4.5);

  // 반대쪽 팔다리 — 몸통보다 먼저 그려 뒤로 보낸다.
  // 앞쪽 것과 2px 넘게 떨어뜨려야 네 개가 한 덩어리로 뭉치지 않는다.
  O(buf, torsoCx - torsoRx * 0.8 - step, GROUND - m.limb * 0.24, 1.2, m.limb * 0.28 + 1.0, C.suitDark);
  O(buf, torsoCx + torsoRx * 0.48 + step, GROUND - m.limb * 0.24 - sway, 1.2, m.limb * 0.28 + 1.0, C.suitDark);

  volume(buf, torsoCx, torsoCy, torsoRx, torsoRy, C.suit, C.suitDark);
  ell(buf, torsoCx - torsoRx * 0.3, torsoCy + torsoRy * 0.45, torsoRx * 0.55, 1.1, C.suitDark);

  // 앞쪽 팔다리 — 손발이 맨살이라 바닥을 짚은 게 보인다
  const back = { x: torsoCx - torsoRx * 0.42 + step, y: GROUND - m.limb * 0.3 + sway };
  volume(buf, back.x, back.y, 1.4, m.limb * 0.34 + 1.0, C.suit, C.suitDark);
  volume(buf, back.x, GROUND - 0.9, 1.7, 1.4, C.skin, C.skinDark);
  const front = { x: torsoCx + torsoRx * 0.86 - step, y: GROUND - m.limb * 0.3 };
  volume(buf, front.x, front.y, 1.4, m.limb * 0.34 + 1.0, C.suit, C.suitDark);
  volume(buf, front.x, GROUND - 0.9, 1.7, 1.4, C.skin, C.skinDark);

  // 고개를 든 자세 — 머리가 몸통 앞 '위'에 올라가야 기어가는 걸로 읽힌다.
  // 몸통과 같은 높이에 두면 머리가 몸을 덮어 덩어리가 된다.
  const hx = torsoCx + torsoRx + m.headR * 0.44;
  const hy = torsoCy - m.headR * 0.95;
  O(buf, hx - m.headR * 0.7, hy + m.headR * 0.88, 1.6, m.neck + 0.4, C.skinDark);
  head(buf, hx, hy, m, blink, 1);
}

function drawLying(buf: Buf, m: Metrics, bob: number, sway: number, blink: boolean) {
  // 등을 바닥에 댄 위에서 본 자세. 신생아가 하루 대부분을 보내는 자세다.
  const cy = GROUND - 13;

  // 몸 전체를 감싸는 넓은 그림자 — 이게 없으면 서 있는 자세와 구분되지 않는다
  ell(buf, CX, cy + 2, m.bodyW + 9, m.bodyH + 5.5, SHADOW, 48);

  for (const s of [-1, 1] as const) {
    volume(buf, CX + s * 3.4, cy + m.bodyH + 2.2, 1.6, m.limb * 0.42 + 1.1, C.suit, C.suitDark);
    volume(buf, CX + s * 4.6, cy + m.bodyH + m.limb * 0.6 + 2.6, 1.6, 1.4, C.sock, C.sockDark);
  }
  volume(buf, CX, cy + bob * 0.5, m.bodyW, m.bodyH, C.suit, C.suitDark);
  ell(buf, CX, cy + m.bodyH * 0.45, m.bodyW * 0.82, 1.0, C.suitDark);

  for (const s of [-1, 1] as const) {
    const ax = CX + s * (m.bodyW + 2.1);
    volume(buf, ax, cy - 0.5 + s * sway, m.limb * 0.4 + 1.0, 1.3, C.suit, C.suitDark);
    volume(buf, ax + s * (m.limb * 0.4 + 1.4), cy - 0.5 + s * sway, 1.4, 1.5, C.skin, C.skinDark);
  }

  const headCy = cy - m.bodyH - m.neck - m.headR * 0.8 + bob * 0.5;
  neck(buf, CX, cy - m.bodyH - m.neck * 0.3, m);
  head(buf, CX, headCy, m, blink);
}

/** 숨쉬기 — 픽셀 아트라 1px 단위로만 움직인다. */
const BOB = [0, 0, -1, -1, 0, 0, 1, 1];
/** 걷기 보폭 — 좌우 다리가 엇갈린다. */
const STEP = [0, 1, 2, 1, 0, -1, -2, -1];

/**
 * (개월수, 자세, 동작) 한 벌의 프레임 전체를 캔버스로 굽는다.
 * 재생 루프는 drawImage 만 하므로 매 프레임 픽셀을 다시 계산하지 않는다.
 */
export function buildFrames(months: number, pose: PixelPose, motion: Motion): HTMLCanvasElement[] {
  const m = metrics(months);

  return Array.from({ length: FRAME_COUNT }, (_, i) => {
    const buf = makeBuf(SPRITE, SPRITE);
    const walking = motion === 'walk';
    const bob = walking ? BOB[(i + 2) % BOB.length] : BOB[i];
    const sway = Math.sin((i / FRAME_COUNT) * Math.PI * 2) * 0.9;
    const step = walking ? STEP[i] : 0;
    // 걸을 땐 깜빡이지 않는다. 멈춰 있을 때만 마지막 프레임에서 깜빡.
    const blink = !walking && i === FRAME_COUNT - 1;

    if (pose === 'standing') drawStanding(buf, m, bob, sway, blink, step);
    else if (pose === 'sitting') drawSitting(buf, m, bob, sway, blink);
    else if (pose === 'crawling') drawCrawling(buf, m, bob, sway, blink, step);
    else drawLying(buf, m, bob, sway, blink);

    return toCanvas(buf);
  });
}
