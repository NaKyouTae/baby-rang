#!/usr/bin/env node
/*
 * 버전 일괄 관리 스크립트
 *
 * 사용법:
 *   node scripts/bump-version.js <patch|minor|major>
 *   pnpm version:patch   (권장)
 *
 * 동작:
 *   - 루트 package.json version을 기준으로 다음 버전을 계산
 *   - 모든 워크스페이스 package.json version 갱신 (root/app/server/admin)
 *   - iOS MARKETING_VERSION(마케팅 버전) → 새 버전
 *   - iOS CURRENT_PROJECT_VERSION(빌드 번호) → +1
 *   - VERSIONING.md 규칙 참고
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const kind = process.argv[2];

if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error('사용법: node scripts/bump-version.js <patch|minor|major>');
  process.exit(1);
}

const PKG_FILES = [
  'package.json',
  'app/package.json',
  'server/package.json',
  'admin/package.json',
];
const PBXPROJ = 'ios/BabyRang/BabyRang.xcodeproj/project.pbxproj';

// 현재 버전 = 루트 package.json 기준
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const current = rootPkg.version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!m) {
  console.error(`루트 package.json version이 X.Y.Z 형식이 아닙니다: ${current}`);
  process.exit(1);
}

let major = Number(m[1]);
let minor = Number(m[2]);
let patch = Number(m[3]);
if (kind === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (kind === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}
const next = `${major}.${minor}.${patch}`;

// 1) package.json들 version 갱신 (최상위 "version" 키만)
for (const rel of PKG_FILES) {
  const p = path.join(ROOT, rel);
  const raw = fs.readFileSync(p, 'utf8');
  const updated = raw.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${next}$2`);
  if (updated === raw) {
    console.warn(`  ! ${rel}: version 필드를 찾지 못해 건너뜀`);
    continue;
  }
  fs.writeFileSync(p, updated);
}

// 2) iOS: MARKETING_VERSION → next (모든 타깃), CURRENT_PROJECT_VERSION → +1
let nextBuild = null;
const pbxPath = path.join(ROOT, PBXPROJ);
if (fs.existsSync(pbxPath)) {
  let pbx = fs.readFileSync(pbxPath, 'utf8');
  pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`);
  const buildMatch = /CURRENT_PROJECT_VERSION = (\d+);/.exec(pbx);
  if (buildMatch) {
    nextBuild = Number(buildMatch[1]) + 1;
    pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuild};`);
  }
  fs.writeFileSync(pbxPath, pbx);
} else {
  console.warn(`  ! iOS 프로젝트 파일을 찾지 못해 건너뜀: ${PBXPROJ}`);
}

console.log(`\n✅ 버전 갱신: ${current} → ${next}  (${kind})`);
console.log(`   package.json ×${PKG_FILES.length} → ${next}`);
console.log(`   iOS MARKETING_VERSION → ${next}`);
if (nextBuild != null) console.log(`   iOS CURRENT_PROJECT_VERSION(빌드번호) → ${nextBuild}`);
console.log('\n다음 할 일:');
console.log(`   1) CHANGELOG.md의 [Unreleased] 항목을 [${next}]로 정리`);
console.log(`   2) git commit -am "chore: release v${next}"`);
console.log(`   3) git tag v${next} && git push --tags`);
console.log('');
