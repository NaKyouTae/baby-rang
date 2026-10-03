/**
 * 방에 놓인 가구 한 개.
 *
 * 좌표는 픽셀이 아니라 타일이다. 픽셀로 저장하면 타일 크기나 기기가 바뀔 때
 * 저장해 둔 방이 전부 어긋난다.
 */
export type Placement = {
  id: string;
  itemId: string;
  name: string;
  spriteKey: string;
  imageUrl: string | null;
  /** 어드민 분류. 러그·바닥재를 바닥에 깔기 위해 들고 있는다. */
  category: string;
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
  /** 그림이 바닥 칸보다 위로 솟는 높이(타일). 옷장처럼 키 큰 가구용. */
  spriteLiftY: number;
};

/**
 * 스프라이트 이미지 캐시.
 * 같은 가구를 둘 놓아도 그림은 한 번만 불러온다.
 */
const cache = new Map<string, HTMLImageElement>();
const pending = new Set<string>();

export function getSprite(url: string): HTMLImageElement | null {
  return cache.get(url) ?? null;
}

/** 아직 안 받은 그림을 받아 둔다. 렌더 루프는 동기라 미리 채워 놔야 한다. */
export function preloadSprites(urls: (string | null)[], onLoaded?: () => void) {
  for (const url of urls) {
    if (!url || cache.has(url) || pending.has(url)) continue;
    pending.add(url);
    const img = new Image();
    // Supabase Storage 는 다른 출처라 캔버스가 오염되지 않게 CORS 를 명시한다
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(url, img);
      pending.delete(url);
      onLoaded?.();
    };
    img.onerror = () => pending.delete(url);
    img.src = url;
  }
}

/** 러그·바닥재는 밟고 지나가는 것이라 다른 가구와 겹쳐도 된다. (서버 판정과 같은 집합) */
export const FLAT_CATEGORIES = new Set(['RUG', 'FLOORING']);

/** 그 자리에 놓으면 다른 가구와 겹치는가. 서버도 같은 검사를 한다 — 여긴 미리 막아주는 용도다. */
export function overlaps(
  list: Placement[],
  moving: Placement,
  tileX: number,
  tileY: number,
): boolean {
  if (FLAT_CATEGORIES.has(moving.category)) return false;
  const x1 = tileX + moving.tileW;
  const y1 = tileY + moving.tileH;
  return list.some((p) => {
    if (p.id === moving.id || FLAT_CATEGORIES.has(p.category)) return false;
    return (
      tileX < p.tileX + p.tileW && p.tileX < x1 && tileY < p.tileY + p.tileH && p.tileY < y1
    );
  });
}
