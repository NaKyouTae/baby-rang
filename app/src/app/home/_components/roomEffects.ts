/**
 * 방 연출 — 스타듀밸리 실내의 분위기를 만드는 것들.
 *   가구 그림자 · 꾸미기 칸 표시 · 아기 발밑 먼지
 * 모두 방 픽셀 좌표로 그린다(PixelScreen 의 캔버스가 이미 방 픽셀 격자다).
 */

// ───────────────────────── 가구 그림자 ─────────────────────────

type Bounds = { x0: number; x1: number; bottom: number };
const boundsCache = new WeakMap<CanvasImageSource, Bounds | null>();

/** 그림에서 실제로 칠해진 아랫줄과 그 줄 근처의 가로 범위. 그림 아래에 여백이 있어도 그림자가 떠 보이지 않게. */
function opaqueBounds(img: HTMLCanvasElement): Bounds | null {
  if (boundsCache.has(img)) return boundsCache.get(img)!;
  let result: Bounds | null = null;
  try {
    const { width: w, height: h } = img;
    const data = img.getContext('2d')!.getImageData(0, 0, w, h).data;
    let bottom = -1;
    for (let y = h - 1; y >= 0 && bottom < 0; y--) {
      for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { bottom = y; break; }
    }
    if (bottom >= 0) {
      // 아랫줄 위로 3줄까지 보고 가로 범위를 잡는다 — 다리 끝 두 점만 보면 그림자가 너무 좁다
      let x0 = w;
      let x1 = -1;
      for (let y = Math.max(0, bottom - 3); y <= bottom; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 0) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
          }
        }
      }
      result = { x0, x1: x1 + 1, bottom: bottom + 1 };
    }
  } catch {
    result = null;
  }
  boundsCache.set(img, result);
  return result;
}

/**
 * 바닥에 놓인 가구 아래 그림자. 스타듀밸리 가구는 바닥에 닿는 면 아래로 짙은 그림자가 한두 줄 비쳐
 * 바닥에 "놓인" 물건으로 읽힌다. 그림자가 없으면 바닥에 붙인 스티커처럼 보인다.
 * 가구 그림보다 먼저 그린다 — 다리 사이로만 비치고 아래로 두 줄 삐져나온다.
 */
export function drawItemShadow(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement | null,
  px0: number,
  py0: number,
  pw: number,
  ph: number,
  flip: boolean,
) {
  const b = img ? opaqueBounds(img) : { x0: 0, x1: pw, bottom: ph };
  if (!b) return;
  const x0 = flip ? pw - b.x1 : b.x0;
  const x1 = flip ? pw - b.x0 : b.x1;
  const w = x1 - x0;
  if (w < 3) return;
  const left = px0 + x0;
  const base = py0 + b.bottom;
  ctx.fillStyle = 'rgba(60,38,20,0.22)';
  ctx.fillRect(left + 1, base - 3, w - 2, 3);
  ctx.fillStyle = 'rgba(60,38,20,0.26)';
  ctx.fillRect(left + 1, base, w - 2, 1);
  ctx.fillStyle = 'rgba(60,38,20,0.12)';
  ctx.fillRect(left + 2, base + 1, w - 4, 1);
}

// ───────────────────────── 꾸미기 칸 표시 ─────────────────────────

/**
 * 꾸미기 모드의 칸 격자 — 화면 전체(가구를 놓을 수 있는 곳 전부)에 16px 칸마다 옅은 선.
 * 세로선은 방 왼쪽 끝(originX)에 맞춰 방 밖 여백까지 같은 칸으로 이어진다.
 */
export function drawEditGrid(ctx: CanvasRenderingContext2D, originX: number, w: number, h: number, tile: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let x = originX - Math.floor(originX / tile) * tile; x < w; x += tile) ctx.fillRect(x, 0, 1, h);
  for (let y = tile; y < h; y += tile) ctx.fillRect(0, y, w, 1);
}

// ───────────────────────── 발밑 먼지 ─────────────────────────

type Puff = { x: number; y: number; born: number; dx: number };
const PUFF_MS = 500;

/** 기거나 걸을 때 발밑에 이는 작은 먼지. 아기마다 일정 간격으로 하나씩 남기고 서서히 사라진다. */
export class Dust {
  private puffs: Puff[] = [];
  private last = new WeakMap<object, number>();

  /** 움직이는 아기마다 부른다. key 는 아기 객체(간격을 아기마다 따로 잰다). */
  step(key: object, x: number, y: number, now: number, gapMs: number) {
    const t = this.last.get(key) ?? 0;
    if (now - t < gapMs) return;
    this.last.set(key, now);
    const side = Math.random() < 0.5 ? -1 : 1;
    this.puffs.push({ x: x + side * (2 + Math.random() * 2), y: y + 1, born: now, dx: side * 0.004 });
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    this.puffs = this.puffs.filter((p) => now - p.born < PUFF_MS);
    for (const p of this.puffs) {
      const t = (now - p.born) / PUFF_MS;
      const x = Math.round(p.x + p.dx * (now - p.born));
      const y = Math.round(p.y - t * 3);
      ctx.fillStyle = `rgba(170,140,105,${(0.55 * (1 - t)).toFixed(3)})`;
      if (t < 0.5) ctx.fillRect(x - 1, y - 1, 2, 2);
      else ctx.fillRect(x, y, 1, 1);
    }
  }
}
