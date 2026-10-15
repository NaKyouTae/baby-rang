import type { MetadataRoute } from "next";

const BASE_URL = "https://baby-rang.spectrify.kr";

/**
 * 공개 페이지만 사이트맵에 포함합니다.
 *
 * 제외 대상:
 * - /additional-info : robots.txt 가 차단한 경로다. 사이트맵에 함께 올리면
 *                     "색인해 달라"와 "읽지 말라"를 동시에 보내는 꼴이라 경고가 난다.
 * - /auth/*         : 인증 콜백 등 비공개
 * - /settings/*     : 로그인 사용자 전용
 * - /payment/*      : 결제 플로우 (직접 접근 X)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/home", changeFrequency: "weekly", priority: 1.0 },
    { path: "/growth-pattern", changeFrequency: "monthly", priority: 0.8 },
    { path: "/growth-record", changeFrequency: "monthly", priority: 0.7 },
    { path: "/wonder-weeks", changeFrequency: "monthly", priority: 0.8 },
    { path: "/physical-growth", changeFrequency: "monthly", priority: 0.6 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
