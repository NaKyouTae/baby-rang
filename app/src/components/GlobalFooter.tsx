"use client";

import { usePathname } from "next/navigation";
import BusinessInfo from "./BusinessInfo";

// 사업자정보는 카드사 심사상 전 페이지 하단에 노출되어야 한다.
// 다만 아래 화면들은 스크롤이 없는 전체화면(또는 overflow-hidden) 레이아웃이라
// 푸터가 잘리거나 흐름을 깨므로 제외한다.
const EXCLUDED_PREFIXES = [
  "/onboarding", // 가입 플로우 (전체화면 스텝)
  "/auth", // OAuth 콜백 (리다이렉트 전용 화면)
  "/dev", // 개발용 트리거 페이지
  "/growth-pattern", // h-[100dvh] + overflow-hidden
  "/nursing-room", // 전체화면 지도
];

function isExcluded(pathname: string) {
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // 검사 응답 화면(/tests/[testId]/test/[submissionId])은 몰입형이라 제외.
  // 결과 화면(/tests/[testId]/result/...)은 결제 경로에 포함되므로 노출한다.
  return /^\/tests\/[^/]+\/test(\/|$)/.test(pathname);
}

export default function GlobalFooter() {
  const pathname = usePathname();
  if (!pathname || isExcluded(pathname)) return null;
  return <BusinessInfo />;
}
