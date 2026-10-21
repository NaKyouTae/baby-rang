/**
 * 창문 밖 하늘을 지금 날씨·시간대로 바꿔 칠한다.
 *
 * 창문 그림(어드민 dynamicSlot = WEATHER)은 유리에 맑은 낮 하늘이 그려져 있고 투명하지 않다.
 * 그래서 뒤에 하늘을 까는 대신 그림에서 하늘 픽셀만 골라 다시 칠한다.
 *   - 하늘: 파란 픽셀(파랑·초록이 빨강보다 확연히 높다)
 *   - 구름·유리 반사: 하늘에 둘러싸인 작은 밝은 덩어리. 아치 창문처럼 프레임도 흰색이라
 *     색만으로는 못 가른다. 원본 크기에서는 둘 사이에 외곽선이 있어 덩어리가 나뉘므로
 *     판별은 원본에서 한 번 하고, 방에 그릴 크기로 줄일 때 블록마다 가장 많은 쪽을 따른다.
 *   - 덩어리 중 가늘고 비스듬한 것(바운딩 박스를 반도 못 채우는 것)은 유리 반사로 본다.
 */

export type SkyCondition = 'clear' | 'partly' | 'overcast' | 'rain' | 'snow';
export type SkyPhase = 'day' | 'dusk' | 'night';
export type WindowSky = { condition: SkyCondition; phase: SkyPhase };

/** 판별 결과. 0 하늘 아님 · 1 하늘 · 2 구름 · 3 유리 반사 */
type Kind = 0 | 1 | 2 | 3;

type Palette = {
  /** 하늘 위·아래 색. 사이를 세 단계로 끊어 픽셀 그림처럼 보이게 한다. */
  top: string;
  bottom: string;
  cloud: string;
  star?: string;
  drop?: string;
  flake?: string;
};

const NIGHT_STAR = '#fff3c4';

/** 맑은 낮은 그림에 그려진 하늘 그대로 둔다(null). */
const PALETTES: Record<SkyPhase, Record<SkyCondition, Palette | null>> = {
  day: {
    clear: null,
    partly: { top: '#8fc3e6', bottom: '#bfe0f3', cloud: '#ffffff' },
    overcast: { top: '#a3afbc', bottom: '#c6ced6', cloud: '#e4e8ec' },
    rain: { top: '#7a8794', bottom: '#97a3ae', cloud: '#b3bcc5', drop: '#dbe7f2' },
    snow: { top: '#b7c2cc', bottom: '#dce2e7', cloud: '#f1f3f5', flake: '#ffffff' },
  },
  dusk: {
    clear: { top: '#e7877a', bottom: '#f8c98b', cloud: '#fde2c6' },
    partly: { top: '#d98a82', bottom: '#efc196', cloud: '#f6dccb' },
    overcast: { top: '#b28c8e', bottom: '#d6b39e', cloud: '#e8d3c6' },
    rain: { top: '#8a7a80', bottom: '#a8948f', cloud: '#c2b2ab', drop: '#e3d6d0' },
    snow: { top: '#b9a3a6', bottom: '#dccbc2', cloud: '#efe4de', flake: '#ffffff' },
  },
  night: {
    clear: { top: '#18213f', bottom: '#2b3966', cloud: '#43527a', star: NIGHT_STAR },
    partly: { top: '#1d2643', bottom: '#2f3b63', cloud: '#4a587d', star: NIGHT_STAR },
    overcast: { top: '#262d3b', bottom: '#383f4f', cloud: '#4f5869' },
    rain: { top: '#232a37', bottom: '#343b4a', cloud: '#4a5262', drop: '#8494a7' },
    snow: { top: '#2a3242', bottom: '#3d4556', cloud: '#566073', flake: '#e9eef3' },
  },
};

/**
 * 기기 시각으로 시간대를 고른다. 해 뜨고 지는 무렵(5~7시, 17~19시)은 노을이다.
 * 홈의 밤·노을은 창문 하늘로만 보여 준다(방 전체 조명은 쓰지 않는다).
 */
export function phaseAt(date: Date): SkyPhase {
  return phaseAtHour(date.getHours() + date.getMinutes() / 60);
}

/** 시각(0~24, 소수 가능)의 시간대 */
export function phaseAtHour(hour: number): SkyPhase {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 5 && h < 7) || (h >= 17 && h < 19)) return 'dusk';
  return 'night';
}

/**
 * 기상청 초단기 값 → 날씨.
 * PTY(강수형태) 0 없음 · 1 비 · 2 비/눈 · 3 눈 · 4 소나기 · 5 빗방울 · 6 빗방울눈날림 · 7 눈날림
 * SKY(하늘상태) 1 맑음 · 3 구름많음 · 4 흐림
 */
export function conditionOf(sky: string | null | undefined, pty: string | null | undefined): SkyCondition {
  const p = Number(pty);
  if (p === 3 || p === 7) return 'snow';
  if (p === 1 || p === 2 || p === 4 || p === 5 || p === 6) return 'rain';
  const s = Number(sky);
  if (s === 4) return 'overcast';
  if (s === 3) return 'partly';
  return 'clear';
}

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** 원본 크기 판별 결과. url 마다 한 번만 만든다. */
const masks = new Map<string, { kind: Uint8Array; w: number; h: number } | null>();

function sourceMask(url: string, img: HTMLImageElement) {
  if (masks.has(url)) return masks.get(url)!;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  let data: Uint8ClampedArray;
  try {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d')!;
    cx.drawImage(img, 0, 0);
    data = cx.getImageData(0, 0, w, h).data;
  } catch {
    // 픽셀을 못 읽으면(CORS) 그림 그대로 둔다
    masks.set(url, null);
    return null;
  }

  const n = w * h;
  const kind = new Uint8Array(n);
  const light = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (data[i * 4 + 3] < 128) continue;
    // 창틀의 푸르스름한 회색은 초록이 빨강과 비슷해 여기서 빠진다
    if (b - r >= 20 && b >= 170 && g - r >= 15) kind[i] = 1;
    else if (r * 0.299 + g * 0.587 + b * 0.114 > 185) light[i] = 1;
  }

  // 밝은 덩어리 중 하늘에 충분히 둘러싸인 작은 것만 구름·반사로 본다
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  const maxSize = n * 0.04;
  for (let start = 0; start < n; start++) {
    if (!light[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    let edge = 0;
    let sky = 0;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const near = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of near) {
        if (j < 0) {
          edge++;
          continue;
        }
        if (light[j]) {
          if (!seen[j]) {
            seen[j] = 1;
            queue[tail++] = j;
          }
        } else {
          edge++;
          if (kind[j] === 1) sky++;
        }
      }
    }
    const size = tail;
    if (size > maxSize || edge === 0 || sky / edge < 0.35) continue;
    const fill = size / ((x1 - x0 + 1) * (y1 - y0 + 1));
    const k: Kind = fill < 0.45 && size > 2 ? 3 : 2;
    for (let q = 0; q < size; q++) kind[queue[q]] = k;
  }

  const result = { kind, w, h };
  masks.set(url, result);
  return result;
}

const painted = new Map<string, HTMLCanvasElement>();

/**
 * 방에 그릴 크기로 줄인 창문 그림(sprite)에 하늘을 다시 칠한 그림.
 * 같은 그림·크기·날씨면 한 번만 만든다. 판별이 안 되면 받은 그림을 그대로 돌려준다.
 *
 * step 은 시간 흐름(150ms 마다 1). 구름은 8 step(1.2초)에 한 칸씩 오른쪽으로 흘러가고(창 폭에서 돌아온다),
 * 비는 step 마다 내려온다. 같은 단계면 같은 그림이라 캐시된다 — 구름은 창 폭, 비는 20 가지에서 돈다.
 */
export function paintWindowSky(
  url: string,
  img: HTMLImageElement,
  sprite: HTMLCanvasElement,
  sky: WindowSky,
  step = 0,
): HTMLCanvasElement {
  const palette = PALETTES[sky.phase][sky.condition];
  if (!palette) return sprite;
  const W = sprite.width;
  const H = sprite.height;
  const rainy = !!palette.drop;
  const cloudShift = rainy ? 0 : Math.floor(step / 8) % W;
  const rainShift = rainy ? step % 20 : 0;
  const key = `${url}@${W}x${H}|${sky.condition}-${sky.phase}|${cloudShift}:${rainShift}`;
  const hit = painted.get(key);
  if (hit) return hit;

  const mask = sourceMask(url, img);
  if (!mask) return sprite;

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(sprite, 0, 0);
  const image = ctx.getImageData(0, 0, W, H);
  const px = image.data;

  // 줄인 픽셀마다 원본 블록에서 가장 많은 판별 결과를 쓴다
  const kinds = new Uint8Array(W * H);
  let skyTop = H;
  let skyBottom = -1;
  const counts = [0, 0, 0, 0];
  for (let y = 0; y < H; y++) {
    const sy0 = Math.floor((y * mask.h) / H);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * mask.h) / H));
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] === 0) continue;
      const sx0 = Math.floor((x * mask.w) / W);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * mask.w) / W));
      counts.fill(0);
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) counts[mask.kind[yy * mask.w + xx]]++;
      }
      let best = 0;
      for (let k = 1; k < 4; k++) if (counts[k] > counts[best]) best = k;
      if (best === 0) continue;
      kinds[y * W + x] = best;
      if (y < skyTop) skyTop = y;
      if (y > skyBottom) skyBottom = y;
    }
  }
  if (skyBottom < 0) {
    painted.set(key, sprite);
    return sprite;
  }

  const top = hex(palette.top);
  const bottom = hex(palette.bottom);
  const cloud = hex(palette.cloud);
  const white: [number, number, number] = [255, 255, 255];
  const star = palette.star ? hex(palette.star) : null;
  const drop = palette.drop ? hex(palette.drop) : null;
  const flake = palette.flake ? hex(palette.flake) : null;
  // 구름 흐름 — 하늘 자리(하늘·구름)에서만, 왼쪽으로 cloudShift 만큼 떨어진 자리가 구름이었으면 구름으로 칠한다
  const moved = cloudShift ? new Uint8Array(kinds) : kinds;
  if (cloudShift) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = kinds[y * W + x];
        if (k !== 1 && k !== 2) continue;
        const sx = (((x - cloudShift) % W) + W) % W;
        moved[y * W + x] = kinds[y * W + sx] === 2 ? 2 : 1;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    const t = Math.round(((y - skyTop) / Math.max(1, skyBottom - skyTop)) * 3) / 3;
    const base = mix(top, bottom, t);
    for (let x = 0; x < W; x++) {
      const k = moved[y * W + x];
      if (!k) continue;
      // 자리마다 고정된 난수 — 별·눈송이가 매 프레임 튀지 않는다
      const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
      let c = k === 1 ? base : k === 2 ? cloud : mix(base, white, 0.3);
      if (star && k === 1 && h % 41 === 0) c = star;
      // 빗줄기 — rainShift 만큼 아래로 내려온 자리에 찍는다
      const ry = y - rainShift * 2 + 40;
      if (drop && k !== 2 && (x + (ry >> 1)) % 4 === 0 && ry % 5 < 3) c = drop;
      if (flake && h % 11 === 0) c = flake;
      const o = (y * W + x) * 4;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
    }
  }
  ctx.putImageData(image, 0, 0);
  painted.set(key, out);
  return out;
}
