/**
 * 화면 전체를 그리는 픽셀 씬.
 *
 * 아이만 픽셀이고 UI 는 CSS 면 두 세계가 섞여 보인다. 그래서 방·패널·버튼·그림자까지
 * 전부 같은 저해상도 버퍼에 그리고, 그 한 장을 정수배로 확대한다.
 * 글자만 예외로 캔버스 위에 픽셀 폰트(Galmuri)로 얹는다 — 한글은 도형으로 못 그린다.
 */

import { ell, hline, makeBuf, panel, px, rect, toCanvas, vline, type Buf } from './pixelDraw';

/** CSS 픽셀 한 칸이 화면에서 차지하는 크기. 정수여야 픽셀이 균일하다. */
export const SCALE = 2;

export const BTN = 28;

export type ActionId = 'feeding' | 'sleep' | 'diaper' | 'growth' | 'wonder' | 'test';

export interface ButtonSlot {
  id: ActionId;
  label: string;
  x: number;
  y: number;
  /** 떠다니는 주기와 위상 — 버튼마다 달라야 기계적으로 안 보인다 */
  period: number;
  phase: number;
}

export interface Layout {
  w: number;
  h: number;
  wallH: number;
  card: { x: number; y: number; w: number; h: number };
  chips: { x: number; y: number; w: number; h: number }[];
  buttons: ButtonSlot[];
  footer: { x: number; y: number; w: number; h: number };
  walk: { x0: number; x1: number; y0: number; y1: number };
}

const C = {
  wall: '#C6DAF0',
  wallTop: '#B2C9E4',
  wallLine: '#A8C1DC',
  skirting: '#E9F1F9',
  skirtingLine: '#94B0CF',
  floor: '#E0C9A4',
  floorLine: '#C9AC80',

  rug: '#EFA9B7',
  rugMid: '#F7CFD8',
  rugIn: '#FBE5E9',
  wood: '#C08C55',
  woodDark: '#8A5F33',
  white: '#FDFDFD',
  line: '#6F5B45',
  sky: '#A6D5EF',
  leaf: '#78AE7F',
  leafDark: '#57885F',
  pot: '#CC835E',
  toyA: '#EFAB29',
  toyB: '#6A9AE1',
  toyC: '#E96C6C',
  shade: '#C2A67C',
  // UI
  panelFill: '#FFFDF8',
  panelLine: '#6F5B45',
  panelShadow: '#5A4733',
  btnFloorShadow: '#6B5744',
};

export const TINT: Record<ActionId, string> = {
  feeding: '#FFE0BE',
  sleep: '#D9E4FA',
  diaper: '#D7F0E2',
  growth: '#E2DAFB',
  wonder: '#FBD9E4',
  test: '#FBEFC2',
};

/* ------------------------------------------------------------------ 레이아웃 */

export function layout(w: number, h: number, safeTop: number, safeBottom: number): Layout {
  const wallH = Math.round(h * 0.38);
  const card = { x: Math.round((w - 154) / 2), y: safeTop + 7, w: 154, h: 31 };

  const chipW = 50;
  const chipGap = 4;
  const chipsY = card.y + card.h + 7;
  const chipsX = Math.round((w - (chipW * 3 + chipGap * 2)) / 2);
  const chips = [0, 1, 2].map((i) => ({ x: chipsX + i * (chipW + chipGap), y: chipsY, w: chipW, h: 25 }));

  const rows = [Math.round(h * 0.42), Math.round(h * 0.57), Math.round(h * 0.72)];
  const defs: [ActionId, string, 'left' | 'right'][] = [
    ['feeding', '수유', 'left'],
    ['sleep', '수면', 'left'],
    ['diaper', '기저귀', 'left'],
    ['growth', '키·몸무게', 'right'],
    ['wonder', '원더윅스', 'right'],
    ['test', '기질검사', 'right'],
  ];
  const buttons: ButtonSlot[] = defs.map(([id, label, side], i) => {
    const row = i % 3;
    return {
      id,
      label,
      x: side === 'left' ? 6 : w - 6 - BTN,
      y: rows[row],
      period: 3.1 + row * 0.5 + (side === 'right' ? 0.3 : 0),
      phase: i * 0.37,
    };
  });

  return {
    w,
    h,
    wallH,
    card,
    chips,
    buttons,
    footer: { x: Math.round((w - 88) / 2), y: h - safeBottom - 26, w: 88, h: 18 },
    // 가구와 버튼 열을 피해서 돌아다닌다
    walk: { x0: 42, x1: w - 42, y0: wallH + 24, y1: h - safeBottom - 40 },
  };
}

/* ------------------------------------------------------------------ 방 가구 */

function box(buf: Buf, x: number, y: number, w: number, h: number, fill: string, line = C.line) {
  rect(buf, x - 1, y - 1, w + 2, h + 2, line);
  rect(buf, x, y, w, h, fill);
}

function window_(buf: Buf, x: number, y: number) {
  box(buf, x, y, 38, 30, C.white);
  rect(buf, x + 2, y + 2, 34, 26, C.sky);
  rect(buf, x + 18, y + 2, 2, 26, C.white);
  rect(buf, x + 2, y + 14, 34, 2, C.white);
  ell(buf, x + 10, y + 8, 4, 2, C.white);
  ell(buf, x + 27, y + 21, 4.5, 2.2, C.white, 190);
  rect(buf, x - 2, y + 31, 42, 2, C.white);
  rect(buf, x - 2, y + 33, 42, 1, C.line);
}

function shelf(buf: Buf, x: number, y: number) {
  rect(buf, x, y, 40, 3, C.wood);
  rect(buf, x, y + 3, 40, 1, C.woodDark);
  ell(buf, x + 7, y - 4, 3.2, 3.8, C.toyA);
  box(buf, x + 16, y - 7, 7, 7, C.toyB);
  ell(buf, x + 32, y - 3, 3, 3, C.toyC);
}

function crib(buf: Buf, x: number, y: number) {
  const w = 38;
  box(buf, x, y + 15, w, 11, C.white);
  rect(buf, x - 1, y - 1, w + 2, 4, C.woodDark);
  rect(buf, x, y, w, 3, C.wood);
  for (let i = 0; i <= w - 2; i += 5) {
    rect(buf, x + i, y, 2, 16, C.woodDark);
    rect(buf, x + i, y, 1, 16, C.wood);
  }
  rect(buf, x - 1, y + 13, w + 2, 4, C.woodDark);
  rect(buf, x, y + 14, w, 3, C.wood);
  rect(buf, x, y + 26, 3, 6, C.woodDark);
  rect(buf, x + w - 3, y + 26, 3, 6, C.woodDark);
}

function toyBox(buf: Buf, x: number, y: number) {
  ell(buf, x + 14, y + 19, 16, 4, C.shade);
  box(buf, x, y, 28, 19, C.toyB);
  rect(buf, x, y, 28, 5, C.white);
  rect(buf, x, y + 5, 28, 1, C.line);
  ell(buf, x + 23, y - 3, 4, 4, C.toyC);
  px(buf, x + 22, y - 4, C.white);
}

function plant(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 5, 8, 2.6, C.shade);
  box(buf, x - 5, y - 6, 10, 11, C.pot);
  ell(buf, x - 4, y - 12, 4.5, 5, C.leafDark);
  ell(buf, x + 4, y - 13, 4.5, 5, C.leaf);
  ell(buf, x, y - 18, 5, 6, C.leaf);
  ell(buf, x - 1, y - 19, 2, 2, C.white, 80);
}

function frame_(buf: Buf, x: number, y: number) {
  box(buf, x, y, 22, 18, C.white);
  rect(buf, x + 2, y + 2, 18, 14, C.sky);
  ell(buf, x + 7, y + 11, 4, 3, C.leaf);
  ell(buf, x + 14, y + 10, 5, 4, C.leafDark);
  ell(buf, x + 16, y + 6, 2.2, 2.2, C.toyA);
}

function ball(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 4, 5, 1.8, C.shade, 120);
  ell(buf, x, y, 4.5, 4.5, C.toyC);
  ell(buf, x - 1.4, y - 1.4, 1.4, 1.4, C.white, 170);
}

function blocks(buf: Buf, x: number, y: number) {
  ell(buf, x + 5, y + 7, 10, 2.4, C.shade, 110);
  box(buf, x, y, 7, 7, C.toyA);
  box(buf, x + 8, y + 1, 6, 6, C.leaf);
  box(buf, x + 3, y - 7, 6, 6, C.toyB);
}

function rug(buf: Buf, cx: number, cy: number, rx: number) {
  ell(buf, cx, cy, rx, rx * 0.4, C.rug);
  ell(buf, cx, cy, rx * 0.86, rx * 0.33, C.rugMid);
  ell(buf, cx, cy, rx * 0.6, rx * 0.21, C.rugIn);
}

/* ------------------------------------------------------------------ 배경 한 장 */

/** 방 + 고정 UI 패널. 정적이라 한 번만 굽고 매 프레임 drawImage 로 깐다. */
export function buildBackground(L: Layout): HTMLCanvasElement {
  const buf = makeBuf(L.w, L.h);
  const { w, h, wallH } = L;

  // 벽 — 위로 갈수록 어둡게 해서 공간감을 준다
  rect(buf, 0, 0, w, wallH, C.wall);
  rect(buf, 0, 0, w, Math.round(wallH * 0.28), C.wallTop);
  for (let x = 0; x < w; x += 16) vline(buf, x, 0, wallH - 7, C.wallLine, 110);

  // 벽장식 — 상단 UI 패널 아래로 내려 가린 데가 없게 한다
  window_(buf, 40, Math.round(wallH * 0.48));
  shelf(buf, w - 78, Math.round(wallH * 0.54));
  frame_(buf, Math.round(w / 2) - 11, Math.round(wallH * 0.6));

  // 걸레받이 — 벽과 바닥 경계를 또렷하게
  rect(buf, 0, wallH - 7, w, 7, C.skirting);
  hline(buf, 0, wallH - 8, w, C.skirtingLine);
  hline(buf, 0, wallH - 1, w, C.skirtingLine);

  // 바닥 — 마루널
  rect(buf, 0, wallH, w, h - wallH, C.floor);
  for (let y = wallH + 12; y < h; y += 13) hline(buf, 0, y, w, C.floorLine, 130);

  rug(buf, Math.round(w / 2), Math.round(wallH + (h - wallH) * 0.58), Math.round(w * 0.3));

  // 바닥에 놓인 것들 — 걸레받이보다 나중에 그려야 다리가 잘리지 않는다
  crib(buf, 36, wallH - 30);
  toyBox(buf, w - 68, wallH - 13);
  plant(buf, w - 46, wallH + 30);
  ball(buf, 52, wallH + 38);
  blocks(buf, w - 58, h - 52);

  // 벽부터 바닥까지 좌우 가장자리를 어둡게 — 방이 하나의 상자로 닫힌 느낌
  for (let x = 0; x < w; x++) {
    const edge = Math.min(x, w - x) / 26;
    if (edge >= 1) continue;
    const alpha = Math.round((1 - edge) * 55);
    for (let y = 0; y < h; y++) px(buf, x, y, C.shade, alpha);
  }

  // 고정 UI 패널 — 글자는 캔버스 위에 따로 얹는다
  panel(buf, L.card.x, L.card.y, L.card.w, L.card.h, {
    fill: C.panelFill, border: C.panelLine, shadow: C.panelShadow, cut: 3, lift: 2,
  });
  // 카드 왼쪽 아바타 칸
  panel(buf, L.card.x + 4, L.card.y + 4, 23, 23, { fill: TINT.feeding, border: C.panelLine, cut: 2 });
  bottleIcon(buf, L.card.x + 15, L.card.y + 16, 0.82);

  for (const chip of L.chips) {
    panel(buf, chip.x, chip.y, chip.w, chip.h, {
      fill: C.panelFill, border: C.panelLine, shadow: C.panelShadow, cut: 2, lift: 2,
    });
  }
  panel(buf, L.footer.x, L.footer.y, L.footer.w, L.footer.h, {
    fill: C.panelFill, border: C.panelLine, shadow: C.panelShadow, cut: 2, lift: 2,
  });

  return toCanvas(buf);
}

/* ------------------------------------------------------------------ 아이콘 */

function bottleIcon(buf: Buf, cx: number, cy: number, s = 1) {
  const k = (v: number) => Math.round(v * s);
  rect(buf, cx - k(1), cy - k(7), k(2), k(2), C.line);
  rect(buf, cx - k(3), cy - k(5), k(6), k(2), C.line);
  rect(buf, cx - k(3), cy - k(3), k(6), k(9), C.line);
  rect(buf, cx - k(2), cy - k(2), k(4), k(7), C.white);
  hline(buf, cx - k(2), cy, k(4), C.line);
  hline(buf, cx - k(2), cy + k(3), k(4), C.line);
}

function moonIcon(buf: Buf, cx: number, cy: number) {
  ell(buf, cx + 1, cy, 6.5, 6.5, C.line);
  // 가운데를 파내 초승달을 만든다. 배경색으로 덮으면 버튼 색이 비치므로 알파 0 으로 지운다.
  for (let y = -8; y <= 8; y++) {
    for (let x = -8; x <= 8; x++) {
      const dx = x - 4;
      const dy = y + 2;
      if (dx * dx + dy * dy <= 5.5 * 5.5) px(buf, cx + x, cy + y, '#000000', 0);
    }
  }
  px(buf, cx - 5, cy - 4, C.line);
}

function diaperIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 7, cy - 5, 14, 3, C.line);
  for (let i = 0; i < 8; i++) {
    const half = Math.round(7 - i * 0.8);
    hline(buf, cx - half, cy - 2 + i, half * 2, C.line);
  }
  rect(buf, cx - 5, cy - 4, 10, 2, C.white);
}

function growthIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 6, cy + 1, 3, 5, C.line);
  rect(buf, cx - 1, cy - 2, 3, 8, C.line);
  rect(buf, cx + 4, cy - 6, 3, 12, C.line);
}

function calendarIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 4, cy - 8, 2, 3, C.line);
  rect(buf, cx + 2, cy - 8, 2, 3, C.line);
  rect(buf, cx - 7, cy - 6, 14, 13, C.line);
  rect(buf, cx - 6, cy - 2, 12, 8, C.white);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) px(buf, cx - 4 + c * 3, cy + r * 3, C.line);
  }
}

function heartIcon(buf: Buf, cx: number, cy: number) {
  ell(buf, cx - 3, cy - 2, 3.4, 3.2, C.line);
  ell(buf, cx + 3, cy - 2, 3.4, 3.2, C.line);
  for (let i = 0; i < 7; i++) {
    const half = Math.round(6 - i * 0.85);
    hline(buf, cx - half, cy + i, half * 2 + 1, C.line);
  }
}

const ICON: Record<ActionId, (buf: Buf, cx: number, cy: number) => void> = {
  feeding: (b, x, y) => bottleIcon(b, x, y),
  sleep: moonIcon,
  diaper: diaperIcon,
  growth: growthIcon,
  wonder: calendarIcon,
  test: heartIcon,
};

/* ------------------------------------------------------------------ 버튼 */

/**
 * 버튼 한 개 스프라이트. 공중에 떠 있으므로 그림자는 여기 넣지 않고
 * 바닥에 따로 그린다(버튼이 올라갈 때 그림자만 작아져야 높이가 읽힌다).
 */
export function buildButton(id: ActionId, pressed: boolean): HTMLCanvasElement {
  const buf = makeBuf(BTN, BTN + 2);
  const y = pressed ? 1 : 0;
  panel(buf, 0, y, BTN, BTN, { fill: TINT[id], border: C.panelLine, cut: 4 });
  // 위쪽 하이라이트 — 둥근 입체감
  hline(buf, 6, y + 2, BTN - 12, '#FFFFFF', 150);
  ICON[id](buf, Math.round(BTN / 2), y + Math.round(BTN / 2));
  return toCanvas(buf);
}

/** 버튼 아래 바닥 그림자. lift 가 클수록 작아지고 흐려진다. */
export function buildButtonShadow(lift: number): HTMLCanvasElement {
  const w = 20;
  const buf = makeBuf(w, 6);
  const k = 1 - lift * 0.055;
  ell(buf, w / 2, 3, 8 * k, 2.2 * k, C.btnFloorShadow, Math.round(70 * k));
  return toCanvas(buf);
}

/** 눌린 버튼을 알아보기 위한 히트 테스트. */
export function hitButton(L: Layout, nx: number, ny: number): ButtonSlot | null {
  for (const b of L.buttons) {
    if (nx >= b.x - 2 && nx <= b.x + BTN + 2 && ny >= b.y - 14 && ny <= b.y + BTN + 10) return b;
  }
  return null;
}
