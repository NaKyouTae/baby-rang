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

import { makeBuf, rect, toCanvas } from './pixelDraw';
import { TILE, WALL_TILES } from './tiles';

export interface Layout {
  w: number;
  h: number;
  offsetX: number;
  walk: { x0: number; x1: number; y0: number; y1: number };
}

const C = {
  /** Color/gray200 — 기본 벽 */
  wall: '#EEF0F1',
  /** Color/gray300 — 기본 바닥 */
  floor: '#DFE0E1',
};


/**
 * 꾸미기 분류 탭.
 *
 * 화면의 탭과 DB 의 분류가 1:1 이 아니다. 벽지 탭 하나가 벽지와 바닥재를 같이 보여주고,
 * 소품 탭이 소품과 장난감을 같이 보여준다. 꾸미는 사람에게는 "벽에 바르는 것"과
 * "바닥에 까는 것"이 한 묶음이지만, 시스템은 둘을 따로 알아야 하기 때문이다.
 *
 * `menu` 는 아이템 카탈로그가 아니라 방 좌우에 놓을 기록 버튼을 고르는 탭이다.
 */
export const CATEGORY_TABS = [
  { id: 'menu', label: '메뉴', categories: [] as string[] },
  { id: 'wallpaper', label: '벽지', categories: ['WALLPAPER', 'FLOORING'] },
  { id: 'window', label: '창문', categories: ['WINDOW'] },
  { id: 'bed', label: '침대', categories: ['BED'] },
  { id: 'furniture', label: '가구', categories: ['FURNITURE'] },
  { id: 'rug', label: '러그', categories: ['RUG'] },
  { id: 'decor', label: '소품', categories: ['DECOR', 'TOY'] },
] as const;

export type CategoryTabId = (typeof CATEGORY_TABS)[number]['id'];

/* ------------------------------------------------------------------ 레이아웃 */

export function layout(w: number, h: number, safeBottom: number): Layout {
  return {
    w,
    h,
    // 방이 캔버스 가로를 꽉 채우므로 가운데 정렬 오프셋이 필요 없다
    offsetX: 0,
    // 아이가 돌아다니는 범위. 위는 벽, 아래는 하단 UI 를 피한다.
    walk: {
      x0: 1.5 * TILE,
      x1: w - 1.5 * TILE,
      y0: (WALL_TILES + 5) * TILE,
      y1: h - safeBottom - 46,
    },
  };
}

/* ------------------------------------------------------------------ 배경 한 장 */

/**
 * 기본 방.
 *
 * 디자인대로 벽과 바닥을 회색 두 단으로만 깐다. 가구·창문·액자는 전부
 * 카탈로그 아이템이라 배경이 들고 있을 이유가 없다 — 배경에 그려 두면
 * 사용자가 치울 수도 옮길 수도 없는 가구가 된다.
 *
 * 벽지·바닥재를 고르면 이 회색 위에 타일이 덮인다.
 */
export function buildRoom(L: Layout): HTMLCanvasElement {
  const buf = makeBuf(L.w, L.h);
  // 디자인 비율 — 벽 4 : 바닥 6 (338px : 506px)
  const wallH = Math.round(L.h * 0.4);
  rect(buf, 0, 0, L.w, wallH, C.wall);
  rect(buf, 0, wallH, L.w, L.h - wallH, C.floor);
  return toCanvas(buf);
}

