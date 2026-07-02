# Changelog

아기랑의 모든 주요 변경사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고,
버전 규칙은 [VERSIONING.md](./VERSIONING.md)(유의적 버전)를 따른다.

분류: `Added`(추가) · `Changed`(변경) · `Fixed`(수정) · `Removed`(삭제) · `Security`(보안)

---

## [Unreleased]

> 릴리스 시 `pnpm version:patch|minor|major`로 버전을 올리고, 아래 항목을 새 버전 헤더로 옮긴다.

### Added
- 기록 화면: 아래로 당겨서 새로고침(pull-to-refresh)
- 어드민: 사용자 메뉴(목록 + 상세 팝업)
- 어드민 대시보드: 엄마/아빠 수, 이번주 가입자 수 지표
- 무한 로그인: 긴 수명 토큰(180일) + 슬라이딩 세션 재발급

### Changed
- 홈 화면 초기 로딩 속도 개선: 위치(geolocation) 대기 제거 + 마지막 좌표 캐시, 인증·아이 정보 stale-while-revalidate 캐시
- 미세먼지/날씨: 홈 전용 경량 호출(`mode=lite`) + 외부 API 타임아웃
- 서버 성능: 쿼리 병렬화, 목록 페이지네이션/인덱스, 이미지 업로드·삭제 병렬 처리

### Fixed
- 로그인이 실제로 풀리지 않았는데 풀린 것처럼 보이는 문제(일시적 실패를 로그아웃으로 오인)
- 아이가 있는데 없는 것처럼 "아이 추가" 화면이 뜨는 문제
- 기록 리스트 우측에 스와이프 삭제 버튼의 빨간 라인이 비치는 현상
- 기록 갱신 시 "불러오는 중" 화면이 깜빡이던 문제

---

## [1.1.0] - 2026-07-02

- 정식 릴리스 기준선(baseline). 3단계 유의적 버전 체계 도입([VERSIONING.md](./VERSIONING.md)).

[Unreleased]: https://github.com/NaKyouTae/baby-rang/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/NaKyouTae/baby-rang/releases/tag/v1.1.0
