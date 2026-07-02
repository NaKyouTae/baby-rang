# 아기랑 버전 정책 (Versioning Policy)

아기랑은 [유의적 버전(Semantic Versioning, SemVer)](https://semver.org/lang/ko/) 규칙을 따라
`MAJOR.MINOR.PATCH` 3단계 버전을 사용한다. (예: `1.2.3`)

```
  1  .  2  .  3
 MAJOR MINOR PATCH
  주    부    수
```

오른쪽으로 갈수록 작은 변화이며, **왼쪽 자리를 올리면 그 오른쪽 자리는 0으로 리셋**한다.

---

## 1. 각 자리의 의미

| 자리 | 이름 | 올리는 기준 | 아기랑 예시 |
|---|---|---|---|
| **MAJOR** (`1`.0.0) | 주 버전 | 호환성이 깨지는 큰 변화 · 전면 개편 | 앱 전면 리뉴얼, 로그인 방식 교체, 데이터 구조 대변경 |
| **MINOR** (1.`1`.0) | 부 버전 | 하위호환되는 **새 기능** 추가 | 수유실 찾기 추가, 기질검사 메뉴 추가, 홈 위젯 추가 |
| **PATCH** (1.1.`1`) | 수 버전 | 버그 수정 · 자잘한 개선 (기능 변화 없음) | 로딩 속도 개선, 로그인 풀림 버그 수정, UI 미세 수정 |

### 판단 가이드
- 기존 사용자가 **놀랄 만큼 바뀌나?** → **MAJOR**
- 없던 게 **새로 생겼나?** → **MINOR**
- 그냥 **고쳐졌나 / 빨라졌나?** → **PATCH**

### 리셋 규칙
- `1.4.2`에서 새 기능 추가 → `1.5.0` (PATCH가 0으로 리셋)
- `1.4.2`에서 대개편 → `2.0.0` (MINOR·PATCH 모두 리셋)

---

## 2. 앱스토어 버전 (중요)

모바일 앱은 **두 개의 번호**를 함께 쓴다. 역할이 다르므로 헷갈리지 말 것.

| 구분 | iOS 키 | Android | 의미 | 예시 |
|---|---|---|---|---|
| **마케팅 버전** | `CFBundleShortVersionString` / `MARKETING_VERSION` | `versionName` | 사용자에게 **보이는** 버전. **여기에 SemVer 적용** | `1.2.0` |
| **빌드 번호** | `CFBundleVersion` / `CURRENT_PROJECT_VERSION` | `versionCode` | 스토어 업로드용 **카운터**. 업로드마다 **무조건 +1** | `2 → 3 → 4` |

- 마케팅 버전은 위 SemVer 규칙(MAJOR.MINOR.PATCH)대로 의미 있게 올린다.
- 빌드 번호는 의미 없이 **매 업로드마다 증가**시킨다. 같은 마케팅 버전을 재업로드(리젝 후 재제출 등)해도 빌드 번호는 반드시 달라야 심사에 올릴 수 있다.

---

## 3. 버전이 관리되는 위치

릴리스 시 **마케팅 버전은 아래를 모두 동일하게** 맞춘다. 빌드 번호는 iOS만 별도로 +1.

| 대상 | 파일 | 필드 |
|---|---|---|
| iOS 마케팅 버전 | `ios/BabyRang/BabyRang.xcodeproj/project.pbxproj` | `MARKETING_VERSION` (3곳 모두 동일하게) |
| iOS 빌드 번호 | 〃 | `CURRENT_PROJECT_VERSION` (업로드마다 +1) |
| 앱(웹) | `app/package.json` | `version` |
| 서버 | `server/package.json` | `version` |
| 어드민 | `admin/package.json` | `version` |
| 모노레포 루트 | `package.json` | `version` |

> 권장: 앱·서버·어드민·루트의 `package.json` `version`을 **마케팅 버전과 통일**한다.
> (현재 0.x로 제각각이면 다음 릴리스에 맞춰 정리)

---

## 4. 릴리스 절차 (체크리스트)

1. 이번 릴리스의 변경 유형 판단 → **MAJOR / MINOR / PATCH** 중 하나 결정
2. 마케팅 버전을 올린다 (예: `1.1.0` → `1.1.1`)
   - iOS `MARKETING_VERSION` (3곳)
   - `app` / `server` / `admin` / 루트 `package.json`
3. iOS `CURRENT_PROJECT_VERSION`(빌드 번호) **+1**
4. `CHANGELOG.md`에 이번 버전 변경사항 기록 (아래 형식)
5. Git 태그 생성: `git tag v1.1.1 && git push --tags`
6. 스토어 제출 / 서버·앱 배포

---

## 5. 변경 이력(CHANGELOG) 형식

`CHANGELOG.md`에 최신 버전을 맨 위에 추가한다.

```markdown
## [1.1.1] - 2026-07-02
### Fixed
- 홈 화면 로딩 속도 개선 (위치·init 대기 제거)
- 로그인 풀림/아이 없음 오표시 수정

### Added
- (새 기능이 있으면 여기에)

### Changed
- (동작 변경이 있으면 여기에)
```

분류 키워드: `Added`(추가) · `Changed`(변경) · `Fixed`(수정) · `Removed`(삭제) · `Security`(보안)

---

## 6. 0.x 시절 규칙 (참고)

버전이 `0.y.z`(정식 출시 전)라면 아직 API/기능이 불안정하다는 의미로,
`0.x`에서는 MINOR 변경에도 호환성이 깨질 수 있다. 정식 출시 시 `1.0.0`으로 올린다.
아기랑 앱은 이미 스토어 출시(마케팅 버전 `1.x`) 상태이므로 `1.0.0` 이후의 규칙(위 1~5)을 따른다.
