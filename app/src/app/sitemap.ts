import type { MetadataRoute } from "next";
import { getAllRegionPaths } from "@/lib/nursingRoomRegions";

const BASE_URL = "https://baby-rang.spectrify.kr";

/**
 * 공개 페이지만 사이트맵에 포함합니다.
 *
 * 제외 대상:
 * - /auth/*         : 인증 콜백 등 비공개
 * - /settings/*     : 로그인 사용자 전용
 * - /payment/*      : 결제 플로우 (직접 접근 X)
 * - 동적 라우트     : [submissionId] 등 개인화 결과
 * - /tests/[testId]/test, /tests/[testId]/result : 제출/결과 흐름
 *
 * 수유실 지역 페이지(/nursing-room/[sido], /nursing-room/[sido]/[sigungu])는
 * 전국 수유실 데이터에서 자동 생성되므로 여기서도 동적으로 채운다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/home", changeFrequency: "weekly", priority: 1.0 },
    { path: "/onboarding", changeFrequency: "monthly", priority: 0.5 },
    { path: "/tests", changeFrequency: "weekly", priority: 0.9 },
    { path: "/growth-pattern", changeFrequency: "monthly", priority: 0.8 },
    { path: "/growth-record", changeFrequency: "monthly", priority: 0.7 },
    { path: "/wonder-weeks", changeFrequency: "monthly", priority: 0.8 },
    { path: "/sleep-golden-time", changeFrequency: "monthly", priority: 0.8 },
    { path: "/nursing-room", changeFrequency: "weekly", priority: 0.7 },
    { path: "/air-quality", changeFrequency: "daily", priority: 0.6 },
    { path: "/physical-growth", changeFrequency: "monthly", priority: 0.6 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${BASE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  const { sidos, pairs } = await getAllRegionPaths();

  const sidoEntries: MetadataRoute.Sitemap = sidos.map((sido) => ({
    url: `${BASE_URL}/nursing-room/${encodeURIComponent(sido)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const sigunguEntries: MetadataRoute.Sitemap = pairs.map(({ sido, sigungu }) => ({
    url: `${BASE_URL}/nursing-room/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...sidoEntries, ...sigunguEntries];
}
