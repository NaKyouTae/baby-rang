#!/usr/bin/env node
/**
 * 방 꾸미기 아이템 시트 자르기.
 *
 * ChatGPT 에 아이템 여러 개를 한 장(시트)에 그려 달라고 한 뒤, 이 스크립트로 아이템마다
 * 잘라 이름을 붙이고 방 칸 크기(16px 단위)의 실제 픽셀 크기 PNG 로 저장한다.
 *
 *   node scripts/slice-sprites.mjs <시트.png> <시트 이름> [출력 폴더]
 *   예) node scripts/slice-sprites.mjs ~/Downloads/sheet.png floor-decor
 *
 * 시트 이름은 scripts/sprite-sheets/<이름>.json — 아이템 순서(왼쪽 위부터 가로로)와 크기가 들어 있다.
 * 출력 폴더를 안 주면 scripts/sprite-out/<시트 이름>/ 에 저장한다.
 *
 * 하는 일
 *   1. 배경 지우기 — 투명이면 그대로, 단색·체크무늬(가짜 투명) 배경이면 가장자리부터 지운다.
 *   2. 아이템 찾기 — 붙어 있는 덩어리를 찾는다. 가랜드 깃발처럼 살짝 떨어진 조각은 한 아이템으로 묶는다.
 *   3. 순서 정하기 — 위 줄부터, 줄 안에서는 왼쪽부터. 시트 json 의 순서와 맞춰 이름을 붙인다.
 *   4. 크기 맞추기 — 칸 블록마다 가장 많은 색을 골라 줄인다(픽셀아트가 뭉개지지 않게).
 *   5. 확인용 _preview.png — 결과를 4배로 나란히. 벽지·바닥재(tile)는 3×3 으로 이어 붙여 이음매를 보여 준다.
 *
 * 개수가 안 맞으면 저장하지 않고 _boxes.png(찾은 상자 표시)를 남긴다.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** sharp 는 앱(next) 의존성으로 설치돼 있다. 워크스페이스 어디서든 찾는다. */
function loadSharp() {
  for (const from of ['app', 'admin', 'server', '.']) {
    try {
      return createRequire(join(ROOT, from, 'package.json'))('sharp');
    } catch {
      /* 다음 위치 */
    }
  }
  const pnpm = join(ROOT, 'node_modules/.pnpm');
  const dir = existsSync(pnpm) && readdirSync(pnpm).find((d) => d.startsWith('sharp@'));
  if (dir) return createRequire(import.meta.url)(join(pnpm, dir, 'node_modules/sharp'));
  throw new Error('sharp 를 찾지 못했습니다. 루트에서 pnpm install 을 먼저 실행하세요.');
}
const sharp = loadSharp();

const [, , sheetPath, sheetName, outArg] = process.argv;
if (!sheetPath || !sheetName) {
  console.log('사용법: node scripts/slice-sprites.mjs <시트.png> <시트 이름> [출력 폴더]');
  console.log('시트 이름:', readdirSync(join(ROOT, 'scripts/sprite-sheets')).map((f) => basename(f, '.json')).join(', '));
  process.exit(1);
}
const specPath = join(ROOT, 'scripts/sprite-sheets', `${sheetName}.json`);
if (!existsSync(specPath)) {
  console.error(`시트 정의가 없습니다: ${specPath}`);
  process.exit(1);
}
/** @type {{ items: { name: string; w: number; h: number; tile?: boolean }[] }} */
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const outDir = resolve(outArg ?? join(ROOT, 'scripts/sprite-out', sheetName));
mkdirSync(outDir, { recursive: true });

const { data: src, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

// ───────────── 1. 배경 지우기 ─────────────
const bg = new Uint8Array(N);
let transparent = 0;
for (let i = 0; i < N; i++) if (src[i * 4 + 3] < 128) transparent++;
if (transparent > N * 0.05) {
  for (let i = 0; i < N; i++) bg[i] = src[i * 4 + 3] < 128 ? 1 : 0;
} else {
  // 가장자리에서 가장 흔한 색 두 개(체크무늬면 두 회색) — 이 색과 비슷하고 가장자리와 이어진 곳만 배경
  const counts = new Map();
  const q = (i) => `${src[i * 4] >> 4},${src[i * 4 + 1] >> 4},${src[i * 4 + 2] >> 4}`;
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  for (const i of border) counts.set(q(i), (counts.get(q(i)) ?? 0) + 1);
  const keys = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, c]) => c > border.length * 0.1);
  const refs = keys.map(([k]) => k.split(',').map((v) => Number(v) * 16 + 8));
  const near = (i) =>
    refs.some(([r, g, b]) => Math.abs(src[i * 4] - r) + Math.abs(src[i * 4 + 1] - g) + Math.abs(src[i * 4 + 2] - b) < 48);
  const stack = border.filter(near);
  for (const i of stack) bg[i] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i / W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j >= 0 && !bg[j] && near(j)) {
        bg[j] = 1;
        stack.push(j);
      }
    }
  }
}

// ───────────── 2. 아이템 찾기 ─────────────
// 살짝 떨어진 조각(가랜드 깃발, 모빌 장식)을 묶으려고 마스크를 부풀려서 덩어리를 센다.
const R = Math.max(4, Math.round(Math.min(W, H) * 0.012));
const fat = new Uint8Array(N);
{
  const rowPass = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    let last = -Infinity;
    for (let x = 0; x < W; x++) {
      if (!bg[y * W + x]) last = x;
      if (x - last <= R) rowPass[y * W + x] = 1;
    }
    last = Infinity;
    for (let x = W - 1; x >= 0; x--) {
      if (!bg[y * W + x]) last = x;
      if (last - x <= R) rowPass[y * W + x] = 1;
    }
  }
  for (let x = 0; x < W; x++) {
    let last = -Infinity;
    for (let y = 0; y < H; y++) {
      if (rowPass[y * W + x]) last = y;
      if (y - last <= R) fat[y * W + x] = 1;
    }
    last = Infinity;
    for (let y = H - 1; y >= 0; y--) {
      if (rowPass[y * W + x]) last = y;
      if (last - y <= R) fat[y * W + x] = 1;
    }
  }
}
const label = new Int32Array(N).fill(-1);
const boxes = [];
for (let s = 0; s < N; s++) {
  if (!fat[s] || label[s] >= 0) continue;
  const id = boxes.length;
  const box = { id, x0: W, y0: H, x1: -1, y1: -1, px: 0 };
  const stack = [s];
  label[s] = id;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i / W) | 0;
    if (!bg[i]) {
      // 상자는 부풀리기 전 실제 픽셀로 잡는다
      box.px++;
      if (x < box.x0) box.x0 = x;
      if (y < box.y0) box.y0 = y;
      if (x > box.x1) box.x1 = x;
      if (y > box.y1) box.y1 = y;
    }
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j >= 0 && fat[j] && label[j] < 0) {
        label[j] = id;
        stack.push(j);
      }
    }
  }
  boxes.push(box);
}
// 먼지 같은 작은 점은 버린다
let found = boxes.filter((b) => b.px > N * 0.0005);

// ───────────── 3. 순서 정하기 — 위 줄부터, 줄 안에서는 왼쪽부터 ─────────────
found.sort((a, b) => a.y0 - b.y0);
const rows = [];
for (const b of found) {
  const cy = (b.y0 + b.y1) / 2;
  const row = rows.find((r) => cy >= r.y0 && cy <= r.y1);
  if (row) {
    row.items.push(b);
    row.y0 = Math.min(row.y0, b.y0);
    row.y1 = Math.max(row.y1, b.y1);
  } else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
}
found = rows.sort((a, b) => a.y0 - b.y0).flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));

if (found.length !== spec.items.length) {
  await saveBoxes(found);
  console.error(`아이템 ${spec.items.length}개를 기대했는데 ${found.length}개를 찾았습니다.`);
  console.error(`찾은 상자를 ${join(outDir, '_boxes.png')} 에 표시했습니다. 아이템끼리 붙었거나 한 아이템이 둘로 떨어졌는지 확인하세요.`);
  process.exit(1);
}

// ───────────── 4. 크기 맞추기 ─────────────
/** 블록마다 가장 많은 색. 불투명 픽셀이 1/4 미만이면 투명. */
function downscale(b, tw, th) {
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  const out = Buffer.alloc(tw * th * 4);
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = b.x0 + Math.floor((tx * bw) / tw);
      const sx1 = b.x0 + Math.max(Math.floor(((tx + 1) * bw) / tw), Math.floor((tx * bw) / tw) + 1);
      const sy0 = b.y0 + Math.floor((ty * bh) / th);
      const sy1 = b.y0 + Math.max(Math.floor(((ty + 1) * bh) / th), Math.floor((ty * bh) / th) + 1);
      const buckets = new Map();
      let opaque = 0;
      let total = 0;
      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          total++;
          const i = y * W + x;
          // 상자 안에 걸친 옆 아이템 픽셀은 뺀다
          if (bg[i] || label[i] !== b.id) continue;
          opaque++;
          const k = ((src[i * 4] >> 4) << 8) | ((src[i * 4 + 1] >> 4) << 4) | (src[i * 4 + 2] >> 4);
          const e = buckets.get(k) ?? [0, 0, 0, 0];
          e[0]++;
          e[1] += src[i * 4];
          e[2] += src[i * 4 + 1];
          e[3] += src[i * 4 + 2];
          buckets.set(k, e);
        }
      }
      const o = (ty * tw + tx) * 4;
      if (opaque * 4 < total) continue;
      let best = null;
      for (const e of buckets.values()) if (!best || e[0] > best[0]) best = e;
      out[o] = Math.round(best[1] / best[0]);
      out[o + 1] = Math.round(best[2] / best[0]);
      out[o + 2] = Math.round(best[3] / best[0]);
      out[o + 3] = 255;
    }
  }
  return out;
}

const results = [];
for (let n = 0; n < found.length; n++) {
  const b = found[n];
  const it = spec.items[n];
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  const ratio = bw / bh / (it.w / it.h);
  if (ratio > 1.2 || ratio < 1 / 1.2) {
    console.warn(`⚠ ${it.name}: 그림 비율(${bw}×${bh})이 목표(${it.w}×${it.h})와 달라 늘어나 보일 수 있습니다.`);
  }
  const px = downscale(b, it.w, it.h);
  const file = join(outDir, `${it.name}.png`);
  await sharp(px, { raw: { width: it.w, height: it.h, channels: 4 } }).png().toFile(file);
  results.push({ it, px });
  console.log(`✓ ${it.name}.png  ${it.w}×${it.h}`);
}

// ───────────── 5. 확인용 미리보기 ─────────────
{
  const S = 4;
  const GAP = 8;
  const cells = results.map(({ it }) => ({ w: (it.tile ? it.w * 3 : it.w) * S, h: (it.tile ? it.h * 3 : it.h) * S }));
  const pw = cells.reduce((t, c) => t + c.w + GAP, GAP);
  const ph = Math.max(...cells.map((c) => c.h)) + GAP * 2;
  const layers = [];
  let x = GAP;
  for (let n = 0; n < results.length; n++) {
    const { it, px } = results[n];
    const big = await sharp(px, { raw: { width: it.w, height: it.h, channels: 4 } })
      .resize(it.w * S, it.h * S, { kernel: 'nearest' })
      .png()
      .toBuffer();
    const reps = it.tile ? 3 : 1;
    for (let ry = 0; ry < reps; ry++) {
      for (let rx = 0; rx < reps; rx++) layers.push({ input: big, left: x + rx * it.w * S, top: GAP + ry * it.h * S });
    }
    x += cells[n].w + GAP;
  }
  await sharp({ create: { width: pw, height: ph, channels: 4, background: '#EEDDC4' } })
    .composite(layers)
    .png()
    .toFile(join(outDir, '_preview.png'));
  console.log(`\n저장: ${outDir}\n확인용: ${join(outDir, '_preview.png')}`);
}

/** 개수가 안 맞을 때 — 찾은 상자에 빨간 테두리를 그려 남긴다. */
async function saveBoxes(list) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${list
    .map(
      (b, n) =>
        `<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0 + 1}" height="${b.y1 - b.y0 + 1}" fill="none" stroke="red" stroke-width="4"/>` +
        `<text x="${b.x0 + 4}" y="${b.y0 + 28}" font-size="28" fill="red">${n + 1}</text>`,
    )
    .join('')}</svg>`;
  await sharp(sheetPath).composite([{ input: Buffer.from(svg) }]).png().toFile(join(outDir, '_boxes.png'));
}
