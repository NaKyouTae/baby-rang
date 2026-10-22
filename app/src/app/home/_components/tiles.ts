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

/**
 * 방(12칸) 좌우 밖으로 가구를 놓을 수 있는 칸 수와, 놓을 수 있는 세로 칸 상한.
 * 화면을 줄여 보여 주면(VIEW_ZOOM) 방 밖 여백이 넓어져 거기까지 놓을 수 있다. 서버(rooms.service)도 같은 값으로 받는다.
 */
export const PLACE_MARGIN_X = 6;
export const PLACE_MAX_ROWS = 60;

/** 위에서 몇 줄이 벽인가. 톱다운 실내는 벽을 위쪽 띠로만 보여준다. 디자인 비율(벽 4 : 바닥 6)에 맞춘 값. */
export const WALL_TILES = 10;
export const FLOOR_TOP = WALL_TILES * TILE; // 160

/**
 * 방 맨 위에서 화면 밖(상태바 뒤)으로 숨기는 높이(논리 픽셀).
 * 콘텐츠 영역(상태바 아래) 맨 위에 보이는 방의 높이가 어느 기기든 이 값이 되도록 방을 위로 올린다.
 * iOS 상태바(약 59pt)보다 커야 앱에서도 웹과 같은 자리가 맨 위에 온다.
 */
export const TOP_HIDDEN = 40;

/**
 * 어느 기기든 똑같이 보여 주는 방 무대(논리 픽셀) — 가로 VIEW_W, 세로 VIEW_H(TOP_HIDDEN 아래부터).
 *
 * 화면 폭·기기 픽셀 비율(dpr)에 맞춰 배율을 정하면 기기마다 보이는 칸 수가 달라져,
 * 웹에서 화면 끝에 붙인 가구가 앱에서는 안으로 당겨져 보인다. 그래서 무대 크기를 고정하고
 * 이 무대가 화면에 꼭 들어가는 배율(실수)을 쓴다. 무대 밖으로 남는 화면은 벽·바닥을 이어 그려 채우고, 가구는 놓지 않는다.
 * 가로는 방(12칸)에 양옆 2칸씩 여백을 더한 16칸이다.
 */
export const VIEW_W = 16 * TILE; // 256
export const VIEW_H = 30 * TILE; // 480
/** 무대 양옆 여백 칸 수 — 방 밖으로 가구를 놓을 수 있는 칸 */
export const VIEW_MARGIN_TILES = (VIEW_W - ROOM_W) / 2 / TILE; // 2
/** 무대 안에서 가구를 놓을 수 있는 세로 칸 수(방 맨 위부터) */
export const VIEW_ROWS = Math.floor((TOP_HIDDEN + VIEW_H) / TILE); // 32

/**
 * 방 픽셀 하나의 CSS 크기. 무대(VIEW_W × VIEW_H)가 콘텐츠 영역에 꼭 들어가는 가장 큰 값이다.
 * 정수배가 아니라 고해상도 화면에서 픽셀 굵기가 기기 픽셀 한 개만큼 들쭉날쭉할 수 있지만,
 * 웹·앱·기기 어디서든 같은 칸이 같은 자리에 보이는 것을 우선한다.
 */
export function viewScaleFor(cssWidth: number, contentHeight: number) {
  return Math.min(cssWidth / VIEW_W, contentHeight / VIEW_H);
}

/** 타일 좌표 → 캔버스 픽셀 좌표(왼쪽 위). */
export function tileToPx(offsetX: number, tx: number, ty: number) {
  return { x: offsetX + tx * TILE, y: ty * TILE };
}
