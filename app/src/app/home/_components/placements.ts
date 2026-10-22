import { paintWindowSky, type WindowSky } from './windowSky';

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
  /** 아이템 원래 칸 수(어드민 값). 화면에서 차지하는 칸은 배율을 곱한 wOf/hOf 로 구한다. */
  tileW: number;
  tileH: number;
  /**
   * 사용자가 고른 크기 배율(1·2·3). 정수만 둔다 — 1.5배처럼 나누면 픽셀이 고르지 않게 늘어난다.
   * 예전에 저장된 배치에는 없어 선택값이다.
   */
  scale?: number;
  /** 좌우 반전. 옆모습이면 반전한 쪽이 왼쪽을 보는 모습이다. */
  flipX: boolean;
  /**
   * 정면 / 옆모습 / 뒷모습. 그 그림(sideImageUrl·backImageUrl)이 있는 아이템만 옆·뒤로 둘 수 있다.
   * 예전 배치에는 없어 선택값이다.
   */
  facing?: Facing;
  /** 옆모습(오른쪽을 보는 모습) 그림과 칸 수(어드민 값). 칸 수가 없으면 정면 칸 수의 가로·세로를 바꿔 쓴다. */
  sideImageUrl?: string | null;
  sideTileW?: number | null;
  sideTileH?: number | null;
  /** 뒷모습(벽 쪽을 보는 모습) 그림. 칸 수는 정면과 같다. */
  backImageUrl?: string | null;
  /**
   * 아기가 이 아이템으로 무엇을 할 수 있는지(어드민 RoomItem.affordances).
   * HOLD 붙잡기 · SOFT_FLOOR 푹신한 바닥 · BALL 공 · PUSH_WALKER 보행기 · PLAY 장난감 · SLEEP 침대 · SEAT 의자 · SLIDE 미끄럼틀.
   * 예전에 저장된 배치에는 없을 수 있어 선택값이다 — 없으면 분류로 짐작한다.
   */
  affordances?: string[];
  /**
   * 그림이 실시간 데이터로 바뀌는 자리(어드민 RoomItem.dynamicSlot). WEATHER 면 창문 밖 하늘을
   * 지금 날씨·시간대로 칠한다. 예전에 저장된 배치에는 없어 선택값이다 — 카탈로그를 받으면 채워진다.
   */
  dynamicSlot?: string | null;
};

export type Facing = 'FRONT' | 'SIDE' | 'BACK';

export const MAX_SCALE = 3;

/** 화면에서 차지하는 가로·세로 칸 — 원래 칸 수 × 배율 */
/**
 * 차지하는 칸 수. 크기 배율(scale)은 쓰지 않는다 — 키운 가구는 픽셀이 아기보다 2~3배 굵어져
 * 한 화면에 픽셀 크기가 섞인다(스타듀밸리처럼 모든 그림이 같은 픽셀 크기여야 깔끔하다).
 * 크기가 다른 가구가 필요하면 그림을 따로 만든다. 저장된 scale 값은 지우지 않고 무시만 한다.
 */
type Sized = Pick<Placement, 'tileW' | 'tileH' | 'facing' | 'sideImageUrl' | 'sideTileW' | 'sideTileH'>;
type Faced = Pick<Placement, 'facing' | 'sideImageUrl' | 'backImageUrl'>;
/** 옆으로 놓였는가 — 옆모습 그림이 없으면 방향 값이 남아 있어도 정면으로 본다 */
export const isSide = (p: Pick<Placement, 'facing' | 'sideImageUrl'>) => p.facing === 'SIDE' && !!p.sideImageUrl;
/** 뒤로 놓였는가 — 뒷모습 그림이 없으면 정면으로 본다 */
export const isBack = (p: Pick<Placement, 'facing' | 'backImageUrl'>) => p.facing === 'BACK' && !!p.backImageUrl;
/** 실제로 그려지는 방향 */
export const facingOf = (p: Faced): Facing => (isSide(p) ? 'SIDE' : isBack(p) ? 'BACK' : 'FRONT');
export const wOf = (p: Sized) => (isSide(p) ? (p.sideTileW ?? p.tileH) : p.tileW);
export const hOf = (p: Sized) => (isSide(p) ? (p.sideTileH ?? p.tileW) : p.tileH);
/** 지금 방향의 그림 */
export const imageOf = (p: Pick<Placement, 'imageUrl'> & Faced) =>
  isSide(p) ? p.sideImageUrl! : isBack(p) ? p.backImageUrl! : p.imageUrl;

/**
 * 돌리기 버튼을 누를 때 다음 방향. 한 바퀴 돌면 네 방향을 다 거친다.
 *   정면 → 옆(오른쪽) → 뒤 → 옆(왼쪽) → 정면
 * 그림이 없는 방향은 건너뛴다(옆모습만 있으면 정면 → 오른쪽 → 왼쪽, 뒷모습만 있으면 정면 ↔ 뒤).
 * 돌릴 방향이 없으면 null.
 */
export function nextTurn(p: Faced & Pick<Placement, 'flipX'>): Pick<Placement, 'facing' | 'flipX'> | null {
  const turns: Pick<Placement, 'facing' | 'flipX'>[] = [{ facing: 'FRONT', flipX: false }];
  if (p.sideImageUrl) turns.push({ facing: 'SIDE', flipX: false });
  if (p.backImageUrl) turns.push({ facing: 'BACK', flipX: false });
  if (p.sideImageUrl) turns.push({ facing: 'SIDE', flipX: true });
  if (turns.length === 1) return null;
  const now = facingOf(p);
  // 정면·뒤는 뒤집혀 있어도 같은 자리로 본다
  const i = turns.findIndex((t) => t.facing === now && (now !== 'SIDE' || t.flipX === p.flipX));
  return turns[(i + 1) % turns.length];
}

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
    img.src = url;
    // onload 만 기다리면 첫 drawImage 때 메인 스레드에서 디코드가 일어나 그 프레임이 끊긴다.
    // decode() 로 디코드까지 끝낸 뒤 캐시에 넣어, 렌더 루프는 바로 그릴 수 있는 그림만 본다.
    img
      .decode()
      .then(() => {
        cache.set(url, img);
        onLoaded?.();
      })
      .catch(() => {
        /* 못 받은 그림은 자리 표시로 그려진다 */
      })
      .finally(() => pending.delete(url));
  }
}

/**
 * 방에 그릴 크기로 미리 줄인 그림.
 *
 * 아이템 그림은 256px 처럼 크게 올라오는데 방에서는 48~80px 로 그려진다. 매 프레임
 * "가장 가까운 픽셀" 방식으로 줄이면 1px 에 원본 5px 남짓이 들어가 얇은 테두리가 샘플 사이에
 * 끼어 통째로 빠지고, 어느 쪽 테두리가 빠질지가 놓은 자리마다 달라진다.
 * 그래서 크기별로 한 번만 줄여 두고(블록 단위로 원본 픽셀을 전부 보고 테두리를 살린다) 1:1 로 찍는다.
 */
const scaled = new Map<string, HTMLCanvasElement>();

export function getSpriteAt(url: string, w: number, h: number): HTMLCanvasElement | null {
  const img = cache.get(url);
  if (!img) return null;
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  const key = `${url}@${W}x${H}`;
  let c = scaled.get(key);
  if (!c) {
    c = downscale(img, W, H);
    scaled.set(key, c);
  }
  return c;
}

/**
 * 창문(dynamicSlot = WEATHER) 그림. 줄인 그림에 지금 날씨·시간대 하늘을 칠한다.
 * 맑은 낮이거나 판별이 안 되면 줄인 그림 그대로다.
 */
/** step 은 하늘 움직임(구름 흐름·빗줄기)의 시간 단계 — paintWindowSky 참고 */
export function getWindowSpriteAt(url: string, w: number, h: number, sky: WindowSky, step = 0): HTMLCanvasElement | null {
  const sprite = getSpriteAt(url, w, h);
  const img = cache.get(url);
  if (!sprite || !img) return sprite;
  return paintWindowSky(url, img, sprite, sky, step);
}

/**
 * 픽셀 아트용 축소. 목표 1px 이 덮는 원본 블록을 모두 보고
 *   - 불투명 픽셀이 1/4 이상이면 칠한다(바깥 테두리가 블록 가장자리에 걸쳐도 남는다)
 *   - 블록 안에 둘레보다 확연히 어두운 픽셀(외곽선)이 있으면 그 색을 쓴다
 *   - 아니면 불투명 픽셀의 평균색
 * 결과는 반투명 없이 또렷한 픽셀이다.
 */
function downscale(img: HTMLImageElement, W: number, H: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d')!;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  // 원본보다 키우는 경우엔 그냥 가장 가까운 픽셀로 늘린다
  if (W >= sw || H >= sh) {
    octx.imageSmoothingEnabled = false;
    octx.drawImage(img, 0, 0, W, H);
    return out;
  }
  let src: Uint8ClampedArray;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(img, 0, 0);
    src = tctx.getImageData(0, 0, sw, sh).data;
  } catch {
    // CORS 등으로 픽셀을 못 읽으면 고품질 보간으로라도 줄인다
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, 0, 0, W, H);
    return out;
  }
  const dst = octx.createImageData(W, H);
  const lum = (i: number) => src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
  for (let y = 0; y < H; y++) {
    const sy0 = Math.floor((y * sh) / H);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * sh) / H));
    for (let x = 0; x < W; x++) {
      const sx0 = Math.floor((x * sw) / W);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / W));
      let n = 0;
      let opaque = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let l = 0;
      let minL = 256;
      let minI = -1;
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) {
          const i = (yy * sw + xx) * 4;
          n++;
          if (src[i + 3] < 128) continue;
          opaque++;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          const li = lum(i);
          l += li;
          if (li < minL) {
            minL = li;
            minI = i;
          }
        }
      }
      if (opaque * 4 < n) continue;
      const o = (y * W + x) * 4;
      const mean = l / opaque;
      if (minI >= 0 && mean - minL > 40) {
        // 외곽선 — 어두운 픽셀들의 평균색으로 칠해 선이 끊기지 않게 한다
        let dr = 0;
        let dg = 0;
        let db = 0;
        let dn = 0;
        for (let yy = sy0; yy < sy1; yy++) {
          for (let xx = sx0; xx < sx1; xx++) {
            const i = (yy * sw + xx) * 4;
            if (src[i + 3] < 128 || lum(i) > minL + 25) continue;
            dr += src[i];
            dg += src[i + 1];
            db += src[i + 2];
            dn++;
          }
        }
        dst.data[o] = dr / dn;
        dst.data[o + 1] = dg / dn;
        dst.data[o + 2] = db / dn;
      } else {
        dst.data[o] = r / opaque;
        dst.data[o + 1] = g / opaque;
        dst.data[o + 2] = b / opaque;
      }
      dst.data[o + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}
