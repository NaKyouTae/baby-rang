/**
 * 타일 격자 — 방의 모든 좌표가 기준으로 삼는 단위.
 *
 * 지금까지는 씬 크기를 기기 뷰포트에서 계산했는데, 그 상태로 가구 좌표를 저장하면
 * 아이폰에서 꾸민 방이 안드로이드에서 다르게 보인다. 그래서 방의 논리 크기를
 * 기기와 무관하게 고정하고, 화면에 맞추는 건 배율(SCALE)만 한다.
 */

/** 타일 한 칸의 논리 픽셀. 에셋도 이 배수로 그린다. */
export const TILE = 16;

/** CSS 픽셀 한 칸이 화면에서 차지하는 크기. 정수여야 픽셀이 균일하다. */
export const SCALE = 2;

/** 방의 논리 크기(타일). 기기가 달라도 이 값은 변하지 않는다. */
export const ROOM_W_TILES = 12;
export const ROOM_H_TILES = 20;

export const ROOM_W = ROOM_W_TILES * TILE; // 192
export const ROOM_H = ROOM_H_TILES * TILE; // 320

/** 위에서 몇 줄이 벽인가. 톱다운 실내는 벽을 위쪽 띠로만 보여준다. */
export const WALL_TILES = 8;
export const FLOOR_TOP = WALL_TILES * TILE; // 64

/**
 * 방을 캔버스 가로 가운데에 놓기 위한 오프셋.
 * 세로는 벽이 항상 위에 붙으므로 0 이다 — 화면이 길면 바닥이 더 보일 뿐이다.
 */
export function roomOffsetX(canvasW: number) {
  return Math.round((canvasW - ROOM_W) / 2);
}

/** 타일 좌표 → 캔버스 픽셀 좌표(왼쪽 위). */
export function tileToPx(offsetX: number, tx: number, ty: number) {
  return { x: offsetX + tx * TILE, y: ty * TILE };
}
