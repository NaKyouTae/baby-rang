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

import { ROOM_W, TILE, WALL_TILES } from './tiles';

export interface Layout {
  w: number;
  h: number;
  offsetX: number;
  /** 바닥이 끝나는 y. 그 아래(하단 탭바 뒤)는 방 바깥이다. */
  floorBottom: number;
  walk: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * 바닥 끝에서 캔버스 아래 끝(안전 영역 제외)까지의 높이(방 픽셀). 하단 탭바가 이 자리에 뜬다.
 * 방을 상자로 보이게 바닥은 탭바 바로 위에서 끝내고 앞쪽 마감선을 그린다.
 */
export const BELOW_FLOOR = 48;
/** 바닥 끝에서 아이 발까지 띄우는 높이 — 앞쪽 마감선에 발이 걸치지 않게 */
const FEET_GAP = 6;

/** 바닥이 끝나는 y — 캔버스 높이(h)와 아래 안전 영역(방 픽셀)으로 정한다. */
export function floorBottomOf(h: number, safeBottom: number) {
  return h - safeBottom - BELOW_FLOOR;
}

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

/**
 * w·h 는 캔버스 전체(방 밖 여백 포함), offsetX 는 그 안에서 방(가로 12칸)이 시작하는 x.
 * 정수배로만 키우느라 화면 폭이 12칸보다 조금 넓으면 그만큼 방 양옆이 남는다.
 */
export function layout(w: number, h: number, safeBottom: number, offsetX = 0): Layout {
  const floorBottom = floorBottomOf(h, safeBottom);
  return {
    w,
    h,
    offsetX,
    floorBottom,
    // 아이가 돌아다니는 범위. 위는 벽, 아래는 하단 UI 를 피한다. 가로는 방 안(12칸)에서만.
    walk: {
      x0: offsetX + 1.5 * TILE,
      x1: offsetX + ROOM_W - 1.5 * TILE,
      y0: (WALL_TILES + 3) * TILE,
      y1: floorBottom - FEET_GAP,
    },
  };
}
