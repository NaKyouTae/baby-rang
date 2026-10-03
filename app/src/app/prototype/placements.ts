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
