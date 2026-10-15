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

import { TILE, WALL_TILES } from './tiles';

export interface Layout {
  w: number;
  h: number;
  offsetX: number;
  walk: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * 기본 벽지·바닥 — 벽지나 바닥재를 고르지 않은 방은 모두 이 그림이다.
 * 픽셀 캔버스에 넣으면 흐려지므로 캔버스 뒤에 원본 해상도 그대로 깐다(PixelScreen).
 * 이미지는 public 에 있어 별도 다운로드 목록 없이 첫 화면에 바로 쓴다.
 */
export const DEFAULT_WALLPAPER = '/room/default-wallpaper.png';
export const DEFAULT_FLOORING = '/room/default-flooring.webp';

/**
 * 기본 벽지·바닥을 미리 받아 디코딩까지 해 둔다. 홈에 들어오기 전 화면(로그인 등)에서 부르면
 * 홈의 첫 화면에 바닥이 늦게 떠 깜빡이는 일이 없다. 디코딩한 그림은 이 배열이 붙잡고 있는 동안 메모리에 남는다.
 */
const warmed: HTMLImageElement[] = [];
export function warmRoomImages() {
  if (typeof window === 'undefined' || warmed.length) return;
  for (const src of [DEFAULT_WALLPAPER, DEFAULT_FLOORING]) {
    const img = new Image();
    img.src = src;
    img.decode?.().catch(() => {});
    warmed.push(img);
  }
}

/** 디자인 비율 — 벽 4 : 바닥 6 (338px : 506px). 벽이 끝나는 방 픽셀 y. */
export const wallBottomOf = (h: number) => Math.round(h * 0.4);

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
