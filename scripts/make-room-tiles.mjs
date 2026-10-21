#!/usr/bin/env node
/**
 * 벽지·바닥재 타일(16×16) 9종을 코드로 찍는다.
 *
 * 방은 벽지·바닥재 그림을 16×16 한 칸으로 줄여 바둑판처럼 반복해 깐다. 이음매 없는 16px 무늬는
 * 이미지 생성기가 잘 못 맞추므로 픽셀 단위로 직접 정한다. 모든 무늬는 가장자리에서 반복 주기가 끝나
 * 상하좌우로 이어 붙여도 이음매가 생기지 않는다.
 *
 *   node scripts/make-room-tiles.mjs [출력 폴더]
 *
 * 출력: <이름>.png(16×16, 어드민에 올릴 파일) + _preview.png(각 타일을 4×4 로 이어 8배 확대).
 * 출력 폴더를 안 주면 scripts/sprite-out/tiles/.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
const outDir = resolve(process.argv[2] ?? join(ROOT, 'scripts/sprite-out/tiles'));
mkdirSync(outDir, { recursive: true });

/** 글자 그림 → 좌표 집합. 한 글자가 한 픽셀. */
const shape = (rows, ox, oy) => {
  const set = new Map();
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && set.set(`${ox + x},${oy + y}`, ch)));
  return set;
};

const TILES = {
  // 민트·흰 세로 줄무늬(4px 씩), 민트 줄 왼쪽 끝은 한 단계 진하게
  'wallpaper-mint-stripe': (x) => (x % 8 === 0 ? '#BFE0D0' : x % 8 < 4 ? '#CFEBDD' : '#F4FAF6'),

  // 연하늘 바탕에 작은 구름 하나
  'wallpaper-cloud': (() => {
    const c = shape(['..ww..', '.wwww.', 'wwwwww', 'oooooo'], 5, 6);
    return (x, y) => ({ w: '#FFFFFF', o: '#C6E0EF' })[c.get(`${x},${y}`)] ?? '#DCEEF8';
  })(),

  // 연노랑 바탕에 별 하나와 초승달 하나
  'wallpaper-star-moon': (() => {
    const s = shape(['.s.', 'sss', '.s.'], 3, 3);
    const m = shape(['.mm', 'm..', 'm..', '.mm'], 10, 9);
    return (x, y) => (s.has(`${x},${y}`) ? '#F2C95E' : m.has(`${x},${y}`) ? '#E9B94A' : '#FBF3D6');
  })(),

  // 연분홍 바탕에 하트 하나와 물방울 점 하나
  'wallpaper-heart-dot': (() => {
    const h = shape(['h.h', 'hhh', '.h.'], 3, 3);
    const d = shape(['dd', 'dd'], 11, 11);
    return (x, y) => (h.has(`${x},${y}`) ? '#EE9AAE' : d.has(`${x},${y}`) ? '#F4BCC9' : '#FBE4E9');
  })(),

  // 연노랑·흰 체크(8px)
  'wallpaper-yellow-check': (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? '#FFFBEC' : '#FAEFC2'),

  // 연초록 바탕에 작은 잎 두 개
  'wallpaper-leaf': (() => {
    const a = shape(['.ll', 'll.', 's..'], 2, 3);
    const b = shape(['ll.', '.ll', '..s'], 10, 10);
    return (x, y) => {
      const ch = a.get(`${x},${y}`) ?? b.get(`${x},${y}`);
      return ch === 'l' ? '#A5CF8A' : ch === 's' ? '#8BB872' : '#E5F1DB';
    };
  })(),

  // 밝은 원목 마루 — 4px 판자 4줄, 이음매 엇갈림(방 기본 마루와 같은 색)
  'flooring-light-wood': (() => {
    const plank = ['#E9CDA4', '#E5C79C', '#ECD2AC', '#E7CAA0'];
    const seams = [5, 13, 1, 9];
    return (x, y) => {
      const row = Math.floor(y / 4);
      if (y % 4 === 3 || x === seams[row]) return '#D6B489';
      if (y % 4 === 0 && x === seams[row] + 1) return '#F3DFBE';
      return plank[row];
    };
  })(),

  // 파스텔 퍼즐매트 — 8px 칸 4개, 칸 경계 가운데에 이웃 칸으로 튀어나온 이음 혹
  'flooring-puzzle-mat': (() => {
    const colors = [
      ['#F6C7C8', '#C9E3F4'],
      ['#FAE6A3', '#CDE9C8'],
    ];
    const base = (x, y) => colors[Math.floor(y / 8) % 2][Math.floor(x / 8) % 2];
    return (x, y) => {
      // 세로 경계 가운데 혹: 왼쪽 칸 색이 경계선을 넘어 오른쪽 칸으로 1px 들어간다(경계선도 덮는다)
      if ((x === 7 || x === 8) && (y % 8 === 3 || y % 8 === 4)) return base(6, y);
      // 가로 경계 가운데 혹: 위 칸 색이 아래 칸으로 1px 들어간다
      if ((y === 7 || y === 8) && (x % 8 === 3 || x % 8 === 4)) return base(x, 6);
      // 칸 경계선은 살짝 어둡게
      if (x % 8 === 7 || y % 8 === 7) return '#E7DCCB';
      return base(x, y);
    };
  })(),

  // 연한 베이지 카펫 — 4px 간격으로 엇갈린 작은 점 결
  'flooring-dot-carpet': (x, y) => {
    const dot = (y % 4 === 1 && x % 4 === 1) || (y % 4 === 3 && x % 4 === 3);
    return dot ? '#E2D2B8' : '#EEE3CF';
  },
};

const rgba = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const S = 8;
const REP = 4;
const W = 16 * REP * S;
const previews = [];
for (const [name, fn] of Object.entries(TILES)) {
  const buf = Buffer.alloc(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) buf.set(rgba(fn(x, y)), (y * 16 + x) * 4);
  await sharp(buf, { raw: { width: 16, height: 16, channels: 4 } }).png().toFile(join(outDir, `${name}.png`));
  // 미리보기 — 4×4 로 이어 붙여 8배
  const big = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.floor(x / S) % 16;
      const sy = Math.floor(y / S) % 16;
      buf.copy(big, (y * W + x) * 4, (sy * 16 + sx) * 4, (sy * 16 + sx) * 4 + 4);
    }
  }
  previews.push(await sharp(big, { raw: { width: W, height: W, channels: 4 } }).png().toBuffer());
  console.log(`✓ ${name}.png`);
}
const GAP = 16;
const cols = 3;
const rows = Math.ceil(previews.length / cols);
await sharp({ create: { width: cols * (W + GAP) + GAP, height: rows * (W + GAP) + GAP, channels: 4, background: '#FFFFFF' } })
  .composite(previews.map((input, i) => ({ input, left: GAP + (i % cols) * (W + GAP), top: GAP + Math.floor(i / cols) * (W + GAP) })))
  .png()
  .toFile(join(outDir, '_preview.png'));
console.log(`\n저장: ${outDir}\n확인용: ${join(outDir, '_preview.png')}`);
