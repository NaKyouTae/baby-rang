import type { MetadataRoute } from "next";
// ── 애드센스 승인용 임시 import ── 제거 시 아래 ADSENSE_CONTENT 블록도 함께 삭제
import {
  ADSENSE_CONTENT_ENABLED,
  ADSENSE_CONTENT_ROUTES,
} from "@/lib/adsenseContent";

const BASE_URL = "https://baby-rang.spectrify.kr";

/**
 * 공개 페이지만 사이트맵에 포함합니다.
 *
 * 제외 대상:
 * - /auth/*         : 인증 콜백 등 비공개
 * - /settings/*     : 로그인 사용자 전용
 * - /payment/*      : 결제 플로우 (직접 접근 X)
 * - 동적 라우트     : [submissionId] 등 개인화 결과
 * - /temperament/test, /temperament/result : 제출/결과 흐름
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/home", changeFrequency: "weekly", priority: 1.0 },
    { path: "/temperament", changeFrequency: "monthly", priority: 0.9 },
    { path: "/growth-pattern", changeFrequency: "monthly", priority: 0.8 },
    { path: "/growth-record", changeFrequency: "monthly", priority: 0.7 },
    { path: "/wonder-weeks", changeFrequency: "monthly", priority: 0.8 },
    { path: "/sleep-golden-time", changeFrequency: "monthly", priority: 0.8 },
    { path: "/nursing-room", changeFrequency: "weekly", priority: 0.7 },
    { path: "/air-quality", changeFrequency: "daily", priority: 0.6 },
    { path: "/physical-growth", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  ];

  // ── 애드센스 승인용 임시 라우트 ── ADSENSE_CONTENT_ENABLED = false 시 자동 제외
  if (ADSENSE_CONTENT_ENABLED) {
    routes.push(...ADSENSE_CONTENT_ROUTES);
  }

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
