#!/usr/bin/env node
/**
 * ChatGPT 에서 하나씩 내려받은 아이템 이미지를 아이템 이름으로 바꾼다.
 *
 * ChatGPT 는 내려받는 파일 이름을 정할 수 없어 "ChatGPT Image ….png" 로 저장된다.
 * 프롬프트의 번호 순서대로 내려받은 뒤 이 스크립트를 돌리면, 폴더에서 가장 최근에 받은 이미지 N개를
 * 받은 순서대로 시트 정의(scripts/sprite-sheets/<시트 이름>.json)의 아이템 이름으로 바꾼다.
 *
 *   node scripts/rename-sprites.mjs <시트 이름> [폴더]           — 바꿀 목록만 보여 준다
 *   node scripts/rename-sprites.mjs <시트 이름> [폴더] --apply   — 실제로 바꾼다
 *
 * 폴더를 안 주면 ~/Downloads. 같은 이름 파일이 이미 있으면 덮어쓰지 않고 멈춘다.
 */
import { existsSync, readdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const [sheetName, folderArg] = args.filter((a) => a !== '--apply');
const sheetsDir = join(ROOT, 'scripts/sprite-sheets');

if (!sheetName) {
  console.log('사용법: node scripts/rename-sprites.mjs <시트 이름> [폴더] [--apply]');
  console.log('시트 이름:', readdirSync(sheetsDir).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')).join(', '));
  process.exit(1);
}
const specPath = join(sheetsDir, `${sheetName}.json`);
if (!existsSync(specPath)) {
  console.error(`시트 정의가 없습니다: ${specPath}`);
  process.exit(1);
}
const items = JSON.parse(readFileSync(specPath, 'utf8')).items;
const folder = resolve(folderArg ?? join(homedir(), 'Downloads'));

// 이미 아이템 이름인 파일은 빼고, 가장 최근에 받은 이미지 N개를 받은 순서(오래된 것부터)로
const names = new Set(items.map((it) => `${it.name}.png`));
const images = readdirSync(folder)
  .filter((f) => /\.(png|webp|jpe?g)$/i.test(f) && !names.has(f))
  .map((f) => ({ f, t: statSync(join(folder, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)
  .slice(0, items.length)
  .reverse();

if (images.length < items.length) {
  console.error(`${folder} 에 이미지가 ${images.length}개뿐입니다(${items.length}개 필요).`);
  process.exit(1);
}

const plan = images.map(({ f, t }, i) => ({ from: f, to: `${items[i].name}${extname(f).toLowerCase()}`, t }));
for (const p of plan) {
  if (existsSync(join(folder, p.to))) {
    console.error(`이미 ${p.to} 가 있습니다. 옮기거나 지운 뒤 다시 실행하세요.`);
    process.exit(1);
  }
}

console.log(`${folder} — 받은 순서대로 바꿉니다\n`);
plan.forEach((p, i) => {
  const at = new Date(p.t).toLocaleTimeString('ko-KR');
  console.log(`${String(i + 1).padStart(2)}. ${at}  ${p.from}  →  ${p.to}`);
});

if (!apply) {
  console.log('\n순서가 맞으면 끝에 --apply 를 붙여 다시 실행하세요.');
  process.exit(0);
}
for (const p of plan) renameSync(join(folder, p.from), join(folder, p.to));
console.log(`\n${plan.length}개 이름을 바꿨습니다.`);
