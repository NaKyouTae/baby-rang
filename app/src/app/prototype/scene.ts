/**
 * 화면 전체를 그리는 픽셀 씬 — 톱다운 쿼터뷰 실내.
 *
 * 방과 UI 를 같은 저해상도 버퍼에 그리고 한 장을 정수배로 확대한다.
 * 글자만 예외로 캔버스 위에 픽셀 폰트(Galmuri)로 얹는다 — 한글은 도형으로 못 그린다.
 *
 * 화풍은 GBA 포켓몬 계열을 따른다. 핵심은 세 가지다.
 *   1) 외곽선이 검정이 아니라 그 오브젝트 색의 가장 어두운 톤
 *   2) 한 오브젝트당 색 3~4단계 (윗면 / 기본 / 앞면 / 외곽선)
 *   3) 빈 바닥을 두지 않고 소품으로 채운다
 */

import { ell, hline, makeBuf, panel, px, rect, toCanvas, vline, type Buf } from './pixelDraw';
import { FLOOR_TOP, ROOM_W_TILES, TILE, WALL_TILES, roomOffsetX } from './tiles';

export const BTN = 28;

export type ActionId = 'feeding' | 'sleep' | 'diaper' | 'growth' | 'wonder' | 'test';

export interface ButtonSlot {
  id: ActionId;
  label: string;
  x: number;
  y: number;
  period: number;
  phase: number;
}

export interface Layout {
  w: number;
  h: number;
  offsetX: number;
  card: { x: number; y: number; w: number; h: number };
  decorate: { x: number; y: number; w: number; h: number };
  chips: { x: number; y: number; w: number; h: number }[];
  buttons: ButtonSlot[];
  footer: { x: number; y: number; w: number; h: number };
  walk: { x0: number; x1: number; y0: number; y1: number };
}

const C = {
  wall: '#F0E2C6',
  wallStripe: '#E4D2AE',
  wallShade: '#D6C098',
  molding: '#C68E52',
  moldingTop: '#E0AE74',
  moldingLine: '#8A5A28',

  floorPlank: '#E3B37E',
  floorDark: '#D29F66',
  floorLine: '#B98448',
  wood: '#D09A5E',
  woodTop: '#E6B47C',
  woodLine: '#7E4E20',
  cloth: '#FFFFFF',
  clothShade: '#DCE4EE',
  clothLine: '#97A4B4',
  quilt: '#8FD9B0',
  quiltDark: '#6BBC90',
  quiltLine: '#357F58',
  rug: '#F296AC',
  rugMid: '#F8BDCB',
  rugIn: '#FBDCE4',
  rugLine: '#C45B78',
  sky: '#8FD0F2',
  skyLine: '#4E9CC8',
  leaf: '#78C080',
  leafDark: '#4E9458',
  leafLine: '#2E6838',
  pot: '#D88A5E',
  potLine: '#8E4A24',
  toyA: '#F7C13A',
  toyB: '#6EA6EE',
  toyC: '#F27272',
  toyLine: '#8A5A1A',
  shade: '#B89060',
  panelFill: '#FFFBEF',
  panelLine: '#7A5A36',
  panelShadow: '#5A4026',
  btnShadow: '#6B5134',
};

export const TINT: Record<ActionId, string> = {
  feeding: '#FFDFB4',
  sleep: '#CFDEFA',
  diaper: '#CCEFDC',
  growth: '#DDD2FB',
  wonder: '#FBD0DF',
  test: '#FBEBB4',
};

/* ------------------------------------------------------------------ 레이아웃 */

export function layout(w: number, h: number, safeTop: number, safeBottom: number): Layout {
  const offsetX = roomOffsetX(w);
  // 오른쪽 끝에 꾸미기 버튼 자리를 비우느라 카드를 중앙이 아니라 왼쪽에 붙인다.
  const decorate = { x: w - 6 - 30, y: safeTop + 7, w: 30, h: 31 };
  const card = { x: 6, y: safeTop + 7, w: decorate.x - 12, h: 31 };

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
    ['growth', '성장', 'right'],
    ['wonder', '원더윅스', 'right'],
    ['test', '기질', 'right'],
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
    offsetX,
    card,
    decorate,
    chips,
    buttons,
    footer: { x: Math.round((w - 88) / 2), y: h - safeBottom - 26, w: 88, h: 18 },
    // 가구를 피해 바닥 아래쪽에서만 돌아다닌다. 타일 좌표를 픽셀로 환산한다.
    walk: {
      x0: offsetX + 1.5 * TILE,
      x1: offsetX + (ROOM_W_TILES - 1.5) * TILE,
      y0: (WALL_TILES + 5) * TILE,
      y1: h - safeBottom - 46,
    },
  };
}

/* ------------------------------------------------------------------ 가구 */

/** 윗면·앞면·외곽선 3단으로 된 상자. 쿼터뷰 가구의 기본형. */
function crate(buf: Buf, x: number, y: number, w: number, h: number, top: string, front: string, line: string, frontH = 4) {
  rect(buf, x - 1, y - 1, w + 2, h + 2, line);
  rect(buf, x, y, w, h - frontH, top);
  rect(buf, x, y + h - frontH, w, frontH, front);
  hline(buf, x, y + h - frontH, w, line, 150);
  // 바닥 그림자
  ell(buf, x + w / 2, y + h + 2, w * 0.52, 2.2, C.shade, 90);
}

/** 아기침대 — 위에서 본 모습. 테두리(난간) + 베개 + 이불. */
function crib(buf: Buf, x: number, y: number, w: number, h: number) {
  ell(buf, x + w / 2, y + h + 2, w * 0.5, 2.6, C.shade, 90);
  rect(buf, x - 1, y - 1, w + 2, h + 2, C.woodLine);
  rect(buf, x, y, w, h, C.wood);
  rect(buf, x + 1, y + 1, w - 2, 2, C.woodTop);
  // 난간 살 — 좌우 세로선
  for (let i = y + 4; i < y + h - 3; i += 4) {
    px(buf, x + 1, i, C.woodLine);
    px(buf, x + w - 2, i, C.woodLine);
  }
  // 매트리스
  rect(buf, x + 3, y + 3, w - 6, h - 6, C.cloth);
  hline(buf, x + 3, y + 3, w - 6, C.clothLine, 120);
  // 베개 — 위에서 보면 베개가 침대 폭을 거의 채운다. 작으면 침대로 안 읽힌다.
  rect(buf, x + 5, y + 5, w - 10, 13, C.clothShade);
  rect(buf, x + 5, y + 5, w - 10, 10, C.cloth);
  hline(buf, x + 5, y + 17, w - 10, C.clothLine, 150);
  // 이불 — 아래 3분의 2. 접힌 윗단을 밝게 둬야 덮은 것으로 보인다.
  rect(buf, x + 4, y + 21, w - 8, h - 26, C.quilt);
  rect(buf, x + 4, y + 21, w - 8, 3, '#B4E8CC');
  hline(buf, x + 4, y + 21, w - 8, C.quiltLine, 180);
  rect(buf, x + 4, y + h - 8, w - 8, 3, C.quiltDark);
}

/** 서랍장 — 윗면 + 앞면 + 손잡이. */
function dresser(buf: Buf, x: number, y: number) {
  crate(buf, x, y, 32, 22, C.woodTop, C.wood, C.woodLine, 8);
  for (const dx of [8, 22]) {
    rect(buf, x + dx - 3, y + 17, 6, 2, C.woodLine);
  }
  // 위에 올려둔 인형
  ell(buf, x + 24, y + 6, 3.5, 3.5, C.toyC);
  px(buf, x + 23, y + 5, '#FFFFFF');
}

function toyBox(buf: Buf, x: number, y: number) {
  crate(buf, x, y, 20, 18, C.toyB, '#4E86CE', '#2A5C96', 6);
  // 상자 밖으로 삐져나온 공
  ell(buf, x + 14, y + 4, 4, 4, C.toyC);
  px(buf, x + 13, y + 3, '#FFFFFF');
  ell(buf, x + 6, y + 6, 3, 3, C.toyA);
}

function blocks(buf: Buf, x: number, y: number) {
  ell(buf, x + 8, y + 14, 10, 2.4, C.shade, 90);
  crate(buf, x, y + 4, 8, 8, C.toyA, '#D79C1E', C.toyLine, 3);
  crate(buf, x + 9, y + 6, 7, 7, C.leaf, C.leafDark, C.leafLine, 2);
  crate(buf, x + 3, y - 3, 7, 7, C.toyB, '#4E86CE', '#2A5C96', 2);
}

function plant(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 7, 8, 2.6, C.shade, 90);
  rect(buf, x - 6, y - 1, 12, 9, C.potLine);
  rect(buf, x - 5, y, 10, 7, C.pot);
  hline(buf, x - 5, y, 10, '#EAA87E');
  // 위에서 본 잎 — 중심에서 퍼진다
  for (const [dx, dy, r] of [[-4, -6, 4], [4, -7, 4], [0, -11, 4.5], [-6, -2, 3.5], [6, -3, 3.5]] as const) {
    ell(buf, x + dx, y + dy, r + 0.8, r + 0.8, C.leafLine);
    ell(buf, x + dx, y + dy, r, r, dy < -6 ? C.leaf : C.leafDark);
  }
  px(buf, x - 1, y - 12, '#A8DCAE');
}

/** 바닥에 굴러다니는 곰인형. */
function doll(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 7, 7, 2.4, C.shade, 90);
  for (const s of [-1, 1] as const) {
    ell(buf, x + s * 5, y - 4, 2.8, 2.8, C.woodLine);
    ell(buf, x + s * 5, y - 4, 2.1, 2.1, C.wood);
  }
  ell(buf, x, y + 2, 6, 5.5, C.woodLine);
  ell(buf, x, y + 2, 5.2, 4.8, C.wood);
  ell(buf, x, y - 2, 5, 4.6, C.woodLine);
  ell(buf, x, y - 2, 4.2, 3.9, C.woodTop);
  px(buf, x - 1.6, y - 2.4, '#3A2214');
  px(buf, x + 1.6, y - 2.4, '#3A2214');
  px(buf, x, y - 0.6, '#3A2214');
}

function ball(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 4, 5, 1.8, C.shade, 90);
  ell(buf, x, y, 5, 5, C.toyLine);
  ell(buf, x, y, 4.2, 4.2, C.toyC);
  ell(buf, x - 1.4, y - 1.4, 1.5, 1.5, '#FFFFFF', 190);
}

function rug(buf: Buf, cx: number, cy: number, rx: number) {
  ell(buf, cx, cy, rx + 1, rx * 0.46 + 1, C.rugLine);
  ell(buf, cx, cy, rx, rx * 0.46, C.rug);
  ell(buf, cx, cy, rx * 0.78, rx * 0.36, C.rugMid);
  ell(buf, cx, cy, rx * 0.5, rx * 0.23, C.rugIn);
}

/* ------------------------------------------------------------------ 벽 장식 */

function window_(buf: Buf, x: number, y: number, w: number, h: number) {
  rect(buf, x - 2, y - 2, w + 4, h + 4, C.woodLine);
  rect(buf, x - 1, y - 1, w + 2, h + 2, C.woodTop);
  rect(buf, x, y, w, h, C.sky);
  hline(buf, x, y, w, C.skyLine, 150);
  rect(buf, x + Math.round(w / 2) - 1, y, 2, h, C.woodTop);
  rect(buf, x, y + Math.round(h / 2) - 1, w, 2, C.woodTop);
  ell(buf, x + 9, y + 6, 4, 2, '#FFFFFF');
  ell(buf, x + w - 10, y + h - 7, 4.5, 2.2, '#FFFFFF', 190);
  // 창턱
  rect(buf, x - 3, y + h + 2, w + 6, 3, C.woodTop);
  hline(buf, x - 3, y + h + 5, w + 6, C.woodLine);
}

function frame_(buf: Buf, x: number, y: number) {
  rect(buf, x - 1, y - 1, 24, 20, C.woodLine);
  rect(buf, x, y, 22, 18, C.woodTop);
  rect(buf, x + 2, y + 2, 18, 14, C.sky);
  ell(buf, x + 7, y + 12, 4.5, 3, C.leafDark);
  ell(buf, x + 14, y + 11, 5, 3.5, C.leaf);
  ell(buf, x + 16, y + 6, 2.4, 2.4, C.toyA);
}

function shelf(buf: Buf, x: number, y: number) {
  rect(buf, x, y, 44, 4, C.woodTop);
  hline(buf, x, y + 4, 44, C.woodLine);
  ell(buf, x + 8, y - 4, 3.4, 4, C.toyA);
  rect(buf, x + 17, y - 7, 8, 7, C.toyLine);
  rect(buf, x + 18, y - 6, 6, 5, C.toyB);
  ell(buf, x + 34, y - 3, 3.2, 3.2, C.toyC);
}

/* ------------------------------------------------------------------ 배경 한 장 */

export function buildBackground(L: Layout): HTMLCanvasElement {
  const buf = makeBuf(L.w, L.h);
  const { w, h, offsetX } = L;
  // 타일 좌표 → 픽셀. 가구는 방 격자 기준, 벽·바닥은 캔버스 전체에 깐다.
  const tx = (t: number) => offsetX + t * TILE;
  const ty = (t: number) => t * TILE;

  // 벽 — 세로 줄무늬 벽지
  rect(buf, 0, 0, w, FLOOR_TOP, C.wall);
  for (let x = 0; x < w; x += 8) vline(buf, x, 0, FLOOR_TOP - 6, C.wallStripe);
  rect(buf, 0, FLOOR_TOP - 10, w, 4, C.wallShade, 110);

  window_(buf, tx(1) + 4, ty(5) - 4, 44, 30);
  shelf(buf, tx(7), ty(6) + 2);
  frame_(buf, tx(5) + 4, ty(5));

  // 걸레받이 — 벽과 바닥의 경계
  rect(buf, 0, FLOOR_TOP - 6, w, 6, C.molding);
  hline(buf, 0, FLOOR_TOP - 6, w, C.moldingTop);
  hline(buf, 0, FLOOR_TOP - 1, w, C.moldingLine);

  // 바닥 — 가로로 긴 널빤지. 타일마다 선을 그으면 벽돌처럼 보인다.
  const PLANK_H = TILE * 2;
  rect(buf, 0, FLOOR_TOP, w, h - FLOOR_TOP, C.floorPlank);
  for (let row = 0, y = FLOOR_TOP; y < h; y += PLANK_H, row++) {
    if (row % 2) rect(buf, 0, y, w, PLANK_H, C.floorDark, 45);
    hline(buf, 0, y, w, C.floorLine, 110);
    hline(buf, 0, y + 1, w, '#F0C48E', 70);
    // 널빤지 이음새는 드물게, 줄마다 엇갈리게
    const stagger = row % 2 ? TILE * 3 : 0;
    for (let x = stagger; x < w; x += TILE * 6) vline(buf, x, y + 1, PLANK_H - 1, C.floorLine, 80);
  }

  rug(buf, offsetX + (ROOM_W_TILES / 2) * TILE, ty(15), 48);

  // 가구 — 벽 쪽부터 바닥 쪽으로.
  // 좌우 2타일은 떠 있는 버튼이 덮으므로 보여줄 것은 타일 2~10 사이에 둔다.
  crib(buf, tx(2) - 2, ty(8) + 2, 52, 56);
  dresser(buf, tx(8) - 2, ty(8) + 6);
  toyBox(buf, tx(8) + 2, ty(12) + 4);
  ball(buf, tx(4) + 2, ty(12) + 6);
  blocks(buf, tx(2), ty(18) + 2);
  plant(buf, tx(9) + 2, ty(18));
  ball(buf, tx(7) + 10, ty(17) + 6);
  doll(buf, tx(4) + 4, ty(19) + 2);

  // 좌우 가장자리를 어둡게 — 방이 하나의 상자로 닫힌 느낌
  for (let x = 0; x < w; x++) {
    const edge = Math.min(x, w - x) / 24;
    if (edge >= 1) continue;
    const alpha = Math.round((1 - edge) * 60);
    for (let y = 0; y < h; y++) px(buf, x, y, C.shade, alpha);
  }

  // 고정 UI 패널 — 글자는 캔버스 위에 따로 얹는다
  panel(buf, L.card.x, L.card.y, L.card.w, L.card.h, {
    fill: C.panelFill, border: C.panelLine, shadow: C.panelShadow, cut: 3, lift: 2,
  });
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

  panel(buf, L.decorate.x, L.decorate.y, L.decorate.w, L.decorate.h, {
    fill: TINT.wonder, border: C.panelLine, shadow: C.panelShadow, cut: 3, lift: 2,
  });
  brushIcon(buf, L.decorate.x + L.decorate.w / 2, L.decorate.y + L.decorate.h / 2);

  return toCanvas(buf);
}

/* ------------------------------------------------------------------ 아이콘 */

function bottleIcon(buf: Buf, cx: number, cy: number, s = 1) {
  const k = (v: number) => Math.round(v * s);
  rect(buf, cx - k(1), cy - k(7), k(2), k(2), C.panelLine);
  rect(buf, cx - k(3), cy - k(5), k(6), k(2), C.panelLine);
  rect(buf, cx - k(3), cy - k(3), k(6), k(9), C.panelLine);
  rect(buf, cx - k(2), cy - k(2), k(4), k(7), '#FFFFFF');
  hline(buf, cx - k(2), cy, k(4), C.panelLine);
  hline(buf, cx - k(2), cy + k(3), k(4), C.panelLine);
}

/** 꾸미기 — 붓 하나. 이 크기에선 형태가 단순할수록 알아보기 쉽다. */
function brushIcon(buf: Buf, cx: number, cy: number) {
  // 손잡이
  for (let i = 0; i < 7; i++) px(buf, cx + 3 - i, cy - 5 + i, C.wood);
  for (let i = 0; i < 7; i++) px(buf, cx + 4 - i, cy - 5 + i, C.woodLine);
  // 금속 띠
  rect(buf, cx - 5, cy + 1, 4, 3, C.panelLine);
  // 붓털
  ell(buf, cx - 5, cy + 5, 2.6, 2.6, C.rugLine);
  ell(buf, cx - 5, cy + 4.6, 2.0, 2.0, C.rug);
  // 칠한 자국
  px(buf, cx + 1, cy + 5, C.rug);
  px(buf, cx + 3, cy + 4, C.rug);
  px(buf, cx + 5, cy + 5, C.rug);
}

function moonIcon(buf: Buf, cx: number, cy: number) {
  ell(buf, cx + 1, cy, 6.5, 6.5, C.panelLine);
  // 가운데를 파내 초승달을 만든다. 배경색으로 덮으면 버튼 색이 비치므로 알파 0 으로 지운다.
  for (let y = -8; y <= 8; y++) {
    for (let x = -8; x <= 8; x++) {
      const dx = x - 4;
      const dy = y + 2;
      if (dx * dx + dy * dy <= 5.5 * 5.5) px(buf, cx + x, cy + y, '#000000', 0);
    }
  }
  px(buf, cx - 5, cy - 4, C.panelLine);
}

function diaperIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 7, cy - 5, 14, 3, C.panelLine);
  for (let i = 0; i < 8; i++) {
    const half = Math.round(7 - i * 0.8);
    hline(buf, cx - half, cy - 2 + i, half * 2, C.panelLine);
  }
  rect(buf, cx - 5, cy - 4, 10, 2, '#FFFFFF');
}

function growthIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 6, cy + 1, 3, 5, C.panelLine);
  rect(buf, cx - 1, cy - 2, 3, 8, C.panelLine);
  rect(buf, cx + 4, cy - 6, 3, 12, C.panelLine);
}

function calendarIcon(buf: Buf, cx: number, cy: number) {
  rect(buf, cx - 4, cy - 8, 2, 3, C.panelLine);
  rect(buf, cx + 2, cy - 8, 2, 3, C.panelLine);
  rect(buf, cx - 7, cy - 6, 14, 13, C.panelLine);
  rect(buf, cx - 6, cy - 2, 12, 8, '#FFFFFF');
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) px(buf, cx - 4 + c * 3, cy + r * 3, C.panelLine);
  }
}

function heartIcon(buf: Buf, cx: number, cy: number) {
  ell(buf, cx - 3, cy - 2, 3.4, 3.2, C.panelLine);
  ell(buf, cx + 3, cy - 2, 3.4, 3.2, C.panelLine);
  for (let i = 0; i < 7; i++) {
    const half = Math.round(6 - i * 0.85);
    hline(buf, cx - half, cy + i, half * 2 + 1, C.panelLine);
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

export function buildButton(id: ActionId, pressed: boolean): HTMLCanvasElement {
  const buf = makeBuf(BTN, BTN + 2);
  const y = pressed ? 1 : 0;
  panel(buf, 0, y, BTN, BTN, { fill: TINT[id], border: C.panelLine, cut: 4 });
  hline(buf, 6, y + 2, BTN - 12, '#FFFFFF', 150);
  ICON[id](buf, Math.round(BTN / 2), y + Math.round(BTN / 2));
  return toCanvas(buf);
}

/** 버튼 아래 바닥 그림자. lift 가 클수록 작아지고 흐려진다. */
export function buildButtonShadow(lift: number): HTMLCanvasElement {
  const w = 20;
  const buf = makeBuf(w, 6);
  const k = 1 - lift * 0.055;
  ell(buf, w / 2, 3, 8 * k, 2.2 * k, C.btnShadow, Math.round(70 * k));
  return toCanvas(buf);
}

/** 꾸미기 버튼을 눌렀는가. 손가락이 닿기 쉽게 실제 모양보다 넉넉하게 잡는다. */
export function hitDecorate(L: Layout, nx: number, ny: number) {
  const d = L.decorate;
  return nx >= d.x - 4 && nx <= d.x + d.w + 4 && ny >= d.y - 4 && ny <= d.y + d.h + 6;
}

export function hitButton(L: Layout, nx: number, ny: number): ButtonSlot | null {
  for (const b of L.buttons) {
    if (nx >= b.x - 2 && nx <= b.x + BTN + 2 && ny >= b.y - 14 && ny <= b.y + BTN + 10) return b;
  }
  return null;
}
