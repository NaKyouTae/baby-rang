# Changelog

아기랑의 모든 주요 변경사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고,
버전 규칙은 [VERSIONING.md](./VERSIONING.md)(유의적 버전)를 따른다.

분류: `Added`(추가) · `Changed`(변경) · `Fixed`(수정) · `Removed`(삭제) · `Security`(보안)

---

## [Unreleased]

> 릴리스 시 `pnpm version:patch|minor|major`로 버전을 올리고, 아래 항목을 새 버전 헤더로 옮긴다.

---

## [1.2.2] - 2026-08-12

### Added
- 기록 화면: 아래로 당겨서 새로고침(pull-to-refresh)
- 어드민: 사용자 메뉴(목록 + 상세 팝업)
- 어드민 대시보드: 엄마/아빠 수, 이번주 가입자 수 지표
- 무한 로그인: 긴 수명 토큰(180일) + 슬라이딩 세션 재발급

### Changed
- 홈 화면 초기 로딩 속도 개선: 위치(geolocation) 대기 제거 + 마지막 좌표 캐시, 인증·아이 정보 stale-while-revalidate 캐시
- 미세먼지/날씨: 홈 전용 경량 호출(`mode=lite`) + 외부 API 타임아웃
- 서버 성능: 쿼리 병렬화, 목록 페이지네이션/인덱스, 이미지 업로드·삭제 병렬 처리
- iOS 앱: 결제에 필요한 외부 앱이 설치돼 있지 않으면 안내 메시지 표시
- 결제 복귀 시 로딩 문구를 "결제 내역을 확인하고 있어요"로 분기

### Fixed
- 기질 검사 상세 리포트 결제 후 잠금이 풀리지 않아 두 번 결제해야 하던 문제
  (결과 조회와 결제 unlock 처리가 경쟁해 결제 이전 응답이 결제 이후 상태를 덮어씀)
- 결제 unlock 실패 시 빈 화면이 뜨던 문제 (무료 결과로 폴백)
- iOS 앱: 카드사 앱카드/ISP 인증 후 앱으로 복귀하지 못하던 문제
  (앱 URL 스킴 `babyrang://` 등록 + 결제 요청에 `card.appScheme` 전달)
- iOS 앱: 외부 도메인 링크 이동을 사파리로 넘기면서 카드사 인증 세션이 끊기던 문제
- iOS 앱: `window.open` 기반 결제/인증 팝업이 열리지 않던 문제
- 로그인이 실제로 풀리지 않았는데 풀린 것처럼 보이는 문제(일시적 실패를 로그아웃으로 오인)
- 아이가 있는데 없는 것처럼 "아이 추가" 화면이 뜨는 문제
- 기록 리스트 우측에 스와이프 삭제 버튼의 빨간 라인이 비치는 현상
- 기록 갱신 시 "불러오는 중" 화면이 깜빡이던 문제

---

## [1.1.0] - 2026-07-02

- 정식 릴리스 기준선(baseline). 3단계 유의적 버전 체계 도입([VERSIONING.md](./VERSIONING.md)).

[Unreleased]: https://github.com/NaKyouTae/baby-rang/compare/v1.2.2...HEAD
[1.2.2]: https://github.com/NaKyouTae/baby-rang/compare/v1.1.0...v1.2.2
[1.1.0]: https://github.com/NaKyouTae/baby-rang/releases/tag/v1.1.0
