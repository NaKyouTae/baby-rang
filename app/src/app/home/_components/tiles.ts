/**
 * 타일 격자 — 방의 모든 좌표가 기준으로 삼는 단위.
 *
 * 방의 논리 크기를 기기와 무관하게 고정하고, 화면에 맞추는 건 배율(scale)만 한다.
 * 씬 크기를 기기 뷰포트에서 계산하면 칸 수와 벽 경계가 기기마다 달라져,
 * 아이폰에서 꾸민 방이 웹·안드로이드에서 다르게 보인다.
 */

/** 타일 한 칸의 논리 픽셀. 에셋도 이 배수로 그린다. */
export const TILE = 16;

/** 방의 논리 크기(타일). 기기가 달라도 이 값은 변하지 않는다. */
export const ROOM_W_TILES = 12;
/** 보장하는 최소 세로 칸 수. 화면이 더 길면 바닥이 아래로 더 보이고, 거기까지 가구를 놓을 수 있다. */
export const ROOM_H_TILES = 20;

export const ROOM_W = ROOM_W_TILES * TILE; // 192
export const ROOM_H = ROOM_H_TILES * TILE; // 320

/** 위에서 몇 줄이 벽인가. 톱다운 실내는 벽을 위쪽 띠로만 보여준다. 디자인 비율(벽 4 : 바닥 6)에 맞춘 값. */
export const WALL_TILES = 10;
export const FLOOR_TOP = WALL_TILES * TILE; // 160

/**
 * 방 맨 위에서 화면 밖(상태바 뒤)으로 숨기는 높이(논리 픽셀).
 * iOS 에선 상태바(약 59pt)가 벽 윗부분을 이만큼 덮는다. 상태바가 없는 웹은 그만큼 방을 위로 올려
 * 어느 기기에서든 보이는 벽·바닥 비율을 같게 맞춘다.
 */
export const TOP_HIDDEN = 28;

/**
 * 화면에 맞춘 확대 배율.
 *
 * 가로 12칸이 화면 폭을 꽉 채우게 잡는다. 큰 기기는 칸이 늘지 않고 칸이 커진다.
 * 화면이 최소 높이(ROOM_H)보다 짧으면 높이에 맞춰 줄이고 좌우가 비게 둔다 — 가구가 잘리는 것보다 낫다.
 */
export function scaleFor(cssWidth: number, cssHeight: number) {
  return Math.min(cssWidth / ROOM_W, cssHeight / ROOM_H);
}

/** 타일 좌표 → 캔버스 픽셀 좌표(왼쪽 위). */
export function tileToPx(offsetX: number, tx: number, ty: number) {
  return { x: offsetX + tx * TILE, y: ty * TILE };
}
