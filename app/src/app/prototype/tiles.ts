/**
 * 타일 격자 — 방의 모든 좌표가 기준으로 삼는 단위.
 *
 * 지금까지는 씬 크기를 기기 뷰포트에서 계산했는데, 그 상태로 가구 좌표를 저장하면
 * 아이폰에서 꾸민 방이 안드로이드에서 다르게 보인다. 그래서 방의 논리 크기를
 * 기기와 무관하게 고정하고, 화면에 맞추는 건 배율(SCALE)만 한다.
 */

/** 타일 한 칸의 논리 픽셀. 에셋도 이 배수로 그린다. */
export const TILE = 16;

/**
 * 화면 폭에 맞춘 확대 배율.
 *
 * 2로 고정해 두면 화면이 넓을수록 방 좌우에 여백이 크게 남고, 그 여백에는
 * 가구를 놓을 수 없어 "왜 여기까지 안 가지" 하게 된다. 방이 가로를 꽉 채우도록
 * 배율을 계산한다. 정수여야 픽셀이 균일하다.
 */
export function scaleFor(cssWidth: number) {
  return Math.max(1, Math.floor(cssWidth / ROOM_W));
}

/** 방의 논리 크기(타일). 기기가 달라도 이 값은 변하지 않는다. */
export const ROOM_W_TILES = 12;
export const ROOM_H_TILES = 20;

export const ROOM_W = ROOM_W_TILES * TILE; // 192
export const ROOM_H = ROOM_H_TILES * TILE; // 320

/** 위에서 몇 줄이 벽인가. 톱다운 실내는 벽을 위쪽 띠로만 보여준다. */
export const WALL_TILES = 8;
export const FLOOR_TOP = WALL_TILES * TILE; // 64

/**
 * 가로로 놓을 수 있는 칸 수.
 * 배율을 폭에 맞춰 잡으므로 기기와 상관없이 대개 12~13칸이 된다.
 */
export function tilesAcross(canvasW: number) {
  return Math.floor(canvasW / TILE);
}

/** 타일 좌표 → 캔버스 픽셀 좌표(왼쪽 위). */
export function tileToPx(offsetX: number, tx: number, ty: number) {
  return { x: offsetX + tx * TILE, y: ty * TILE };
}
