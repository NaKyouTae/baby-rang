/**
 * 저해상도 픽셀 버퍼에 그리는 기본 도구.
 * 아이와 방이 같은 픽셀 격자를 공유해야 게더타운 같은 한 장면으로 보이므로,
 * 둘 다 이 프리미티브만 쓴다.
 */

export type Buf = { data: Uint8ClampedArray<ArrayBuffer>; w: number; h: number };

export function makeBuf(w: number, h: number): Buf {
  return { data: new Uint8ClampedArray(new ArrayBuffer(w * h * 4)), w, h };
}

const rgbCache = new Map<string, [number, number, number]>();

function hexToRgb(hex: string): [number, number, number] {
  const hit = rgbCache.get(hex);
  if (hit) return hit;
  const v: [number, number, number] = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  rgbCache.set(hex, v);
  return v;
}

/**
 * 픽셀 하나를 찍는다.
 *
 * 반투명(alpha < 255)은 아래 픽셀과 섞는다(source-over). 섞지 않고 덮어쓰면
 * 그림자나 볼터치를 찍은 자리가 "반투명한 구멍"이 되어 배경이 비친다.
 * alpha 0 은 블렌딩이 아니라 지우개로 쓴다(초승달처럼 모양을 파낼 때).
 */
export function px(buf: Buf, x: number, y: number, hex: string, alpha = 255) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= buf.w || yi >= buf.h) return;
  const i = (yi * buf.w + xi) * 4;

  if (alpha <= 0) {
    buf.data[i + 3] = 0;
    return;
  }

  const [r, g, b] = hexToRgb(hex);
  if (alpha >= 255) {
    buf.data[i] = r;
    buf.data[i + 1] = g;
    buf.data[i + 2] = b;
    buf.data[i + 3] = 255;
    return;
  }

  const sa = alpha / 255;
  const da = buf.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) {
    buf.data[i + 3] = 0;
    return;
  }
  const k = (da * (1 - sa)) / oa;
  const j = sa / oa;
  buf.data[i] = r * j + buf.data[i] * k;
  buf.data[i + 1] = g * j + buf.data[i + 1] * k;
  buf.data[i + 2] = b * j + buf.data[i + 2] * k;
  buf.data[i + 3] = oa * 255;
}

export function rect(buf: Buf, x: number, y: number, w: number, h: number, hex: string, alpha = 255) {
  for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
    for (let xx = Math.round(x); xx < Math.round(x + w); xx++) px(buf, xx, yy, hex, alpha);
  }
}

/** 채워진 타원. 픽셀 격자에 바로 찍으므로 계단형 외곽선이 자연히 생긴다. */
export function ell(buf: Buf, cx: number, cy: number, rx: number, ry: number, hex: string, alpha = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(buf, x, y, hex, alpha);
    }
  }
}

/** 외곽선 있는 타원. 작은 픽셀 캐릭터는 외곽선이 없으면 배경에 녹는다. */
export function ellO(buf: Buf, cx: number, cy: number, rx: number, ry: number, fill: string, outline: string) {
  ell(buf, cx, cy, rx + 0.9, ry + 0.9, outline);
  ell(buf, cx, cy, rx, ry, fill);
}

export function toCanvas(buf: Buf): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = buf.w;
  canvas.height = buf.h;
  canvas.getContext('2d')!.putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0);
  return canvas;
}

/** 가로/세로 직선. */
export function hline(buf: Buf, x: number, y: number, w: number, hex: string, alpha = 255) {
  for (let i = 0; i < w; i++) px(buf, x + i, y, hex, alpha);
}

export function vline(buf: Buf, x: number, y: number, h: number, hex: string, alpha = 255) {
  for (let i = 0; i < h; i++) px(buf, x, y + i, hex, alpha);
}

/** 모서리 픽셀을 깎은 사각형. 픽셀 아트에서 둥근 모서리를 표현하는 방법. */
export function rrect(buf: Buf, x: number, y: number, w: number, h: number, hex: string, cut = 2, alpha = 255) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const dx = Math.min(xx, w - 1 - xx);
      const dy = Math.min(yy, h - 1 - yy);
      // 모서리에서 대각선 안쪽만 남긴다
      if (dx + dy < cut) continue;
      px(buf, x + xx, y + yy, hex, alpha);
    }
  }
}

/**
 * UI 패널 — 그림자 + 테두리 + 면.
 * 떠 있는 느낌은 그림자가 만든다. 아래로 2px 어긋난 어두운 판이 깊이를 준다.
 */
export function panel(
  buf: Buf,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill: string; border: string; shadow?: string; cut?: number; lift?: number },
) {
  const cut = opts.cut ?? 2;
  if (opts.shadow) rrect(buf, x, y + (opts.lift ?? 2), w, h, opts.shadow, cut, 90);
  rrect(buf, x, y, w, h, opts.border, cut);
  rrect(buf, x + 1, y + 1, w - 2, h - 2, opts.fill, Math.max(0, cut - 1));
}
