/**
 * 기본 벽지·바닥과 벽 장식(걸레받이) — 코드로 찍은 픽셀 타일.
 *
 * 예전에는 원본 해상도 그림을 캔버스 뒤에 늘려 깔아서, 방의 픽셀 격자와 크기가 달랐다(아기·가구보다 촘촘하거나 흐렸다).
 * 스타듀밸리처럼 한 화면의 모든 그림이 같은 픽셀 크기여야 깔끔해 보이므로, 기본 벽·바닥도 방 격자(1칸 16px)에 찍는다.
 *
 * 색은 아기·가구와 같은 결: 외곽선은 검정 대신 재질의 가장 어두운 색, 3~4단 명암, 빛은 왼쪽 위.
 */

type Pixel = (x: number, y: number) => string | null;

function paint(w: number, h: number, fn: Pixel): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = fn(x, y);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** 크림색 벽지 — 8px 마다 옅은 세로줄, 줄 사이에 작은 점. 16×16 으로 이음매 없이 반복된다. */
function wallpaperTile() {
  return paint(16, 16, (x, y) => {
    if (x % 8 === 0) return '#EBDCC2';
    if (x % 8 === 1) return '#F7ECD9';
    const dot = (x === 4 && y === 5) || (x === 12 && y === 13);
    if (dot) return '#E0CBA8';
    return '#F2E5CE';
  });
}

/**
 * 원목 마루 — 4px 높이 판자가 가로로 놓이고 판자마다 이음매가 엇갈린다.
 * 16px 로 반복하면 이음매가 줄맞춰 보여 기계적이라, 64×16 한 벌을 반복한다(방 4칸에 한 번).
 */
const PLANK = ['#E9CDA4', '#E5C79C', '#ECD2AC', '#E7CAA0'];
/** 판자 경계 — 판자보다 한 단계만 어둡게. 너무 진하면 줄무늬처럼 시끄럽다. */
const SEAM = '#D6B489';
const SEAMS = [[9, 41], [25, 57], [1, 33], [17, 49]];
function floorTile() {
  return paint(64, 16, (x, y) => {
    const row = Math.floor(y / 4);
    const r = y % 4;
    if (r === 3) return SEAM;
    if (SEAMS[row].includes(x)) return SEAM;
    // 이음매 오른쪽 위는 빛을 받아 밝다
    if (r === 0 && SEAMS[row].some((s) => x === s + 1)) return '#F3DFBE';
    // 나뭇결 — 판자마다 몇 군데만
    if (r === 1 && (x * 7 + row * 13) % 23 === 0) return '#DDBD92';
    return PLANK[row];
  });
}

let cache: { wall: HTMLCanvasElement; floor: HTMLCanvasElement } | null = null;
function tiles() {
  if (!cache) cache = { wall: wallpaperTile(), floor: floorTile() };
  return cache;
}

/** 영역을 그림으로 채운다. 무늬는 방 왼쪽 끝(originX)에 맞춰 반복해 방 밖으로 넘친 곳도 같은 격자로 이어진다. */
function fillWith(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  originX: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const w = img.width;
  const h = img.height;
  const startX = originX - Math.ceil((originX - x0) / w) * w;
  for (let y = y0; y < y1; y += h) {
    for (let x = startX; x < x1; x += w) ctx.drawImage(img, x, y);
  }
}

export function drawDefaultWall(ctx: CanvasRenderingContext2D, originX: number, w: number, wallBottom: number) {
  fillWith(ctx, tiles().wall, originX, 0, 0, w, wallBottom);
}

export function drawDefaultFloor(ctx: CanvasRenderingContext2D, originX: number, w: number, wallBottom: number, h: number) {
  fillWith(ctx, tiles().floor, originX, 0, wallBottom, w, h);
}

/**
 * 걸레받이 — 벽과 바닥이 만나는 곳의 원목 띠(5px)와 그 아래 바닥에 진 그림자(2px).
 * 벽지를 바꿔도 늘 그린다. 이게 있어야 벽이 서 있고 바닥이 앞으로 깔린 공간으로 읽힌다.
 */
export function drawBaseboard(ctx: CanvasRenderingContext2D, w: number, wallBottom: number) {
  const y = wallBottom - 5;
  const band: [number, string][] = [
    [0, '#7A5636'],
    [1, '#E2BE8E'],
    [2, '#CFA472'],
    [3, '#B8895A'],
    [4, '#7A5636'],
  ];
  for (const [dy, col] of band) {
    ctx.fillStyle = col;
    ctx.fillRect(0, y + dy, w, 1);
  }
  ctx.fillStyle = 'rgba(92,60,30,0.22)';
  ctx.fillRect(0, wallBottom, w, 1);
  ctx.fillStyle = 'rgba(92,60,30,0.10)';
  ctx.fillRect(0, wallBottom + 1, w, 1);
}

/** 방 바깥 — 스타듀밸리 실내처럼 방 밖은 어둡게 비워 방이 하나의 상자로 읽히게 한다. */
export const ROOM_VOID = '#2A2024';

/**
 * 방 테두리 — 양옆 벽 단면(6px)과 바닥 앞쪽 마감선(5px).
 * 세로로 긴 화면에서 바닥이 끝없이 이어지면 방이 아니라 무늬 깔린 판처럼 보인다.
 * 좌우·아래 끝을 그려 미니어처 방(디오라마)을 들여다보는 느낌을 준다.
 * x0·x1 은 방의 왼쪽·오른쪽 끝, floorBottom 은 바닥이 끝나는 y.
 */
export function drawRoomFrame(ctx: CanvasRenderingContext2D, x0: number, x1: number, floorBottom: number) {
  const LIP = ['#5B4030', '#C99A6A', '#B8895A', '#9C7350', '#3B2A22'];
  // 바깥 외곽선 · 벽 윗면(밝은 나무 2줄) · 안쪽 면(어두운 나무 2줄) · 안쪽 외곽선
  const SIDE = ['#3B2A22', '#C99A6A', '#B8895A', '#8E6644', '#7A5636', '#3B2A22'];
  // 벽 단면이 바닥에 드리운 옅은 그림자 — 바닥 쪽으로 한 줄
  ctx.fillStyle = 'rgba(60,40,20,0.16)';
  ctx.fillRect(x0 + SIDE.length, 0, 1, floorBottom);
  ctx.fillRect(x1 - SIDE.length - 1, 0, 1, floorBottom);
  LIP.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(x0, floorBottom + i, x1 - x0, 1);
  });
  const bottom = floorBottom + LIP.length;
  SIDE.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(x0 + i, 0, 1, bottom);
    ctx.fillRect(x1 - 1 - i, 0, 1, bottom);
  });
}
