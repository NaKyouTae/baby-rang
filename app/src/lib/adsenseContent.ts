/**
 * ── 애드센스 승인용 임시 콘텐츠 플래그 ──
 *
 * 이 플래그를 `false`로 변경하면 아래 항목이 모두 비활성화됩니다:
 *   - /guide/* 가이드 페이지 6개
 *   - /about 페이지
 *   - AdSenseFooter (개인정보처리방침/이용약관/연락처 링크)
 *   - sitemap 내 가이드/about 경로
 *
 * 승인 완료 후 false 로 전환하거나,
 * 관련 파일을 일괄 삭제하세요.
 *
 * 삭제 대상 파일/폴더:
 *   - app/src/lib/adsenseContent.ts          (이 파일)
 *   - app/src/app/guide/                     (폴더 전체)
 *   - app/src/app/about/                     (폴더 전체)
 *   - app/src/components/ads/AdSenseFooter.tsx
 *   - layout.tsx 내 AdSenseFooter import/사용 부분
 *   - sitemap.ts 내 ADSENSE_CONTENT_ROUTES 관련 코드
 */
export const ADSENSE_CONTENT_ENABLED = true;

/** 애드센스 승인용 임시 라우트 목록 (sitemap용) */
export const ADSENSE_CONTENT_ROUTES = [
  { path: "/guide/wonder-weeks", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/guide/sleep-schedule", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/guide/temperament", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/guide/growth-chart", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/guide/nursing-room", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/guide/breastfeeding", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
];
