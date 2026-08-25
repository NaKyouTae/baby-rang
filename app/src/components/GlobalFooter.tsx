"use client";

import { usePathname } from "next/navigation";
import BusinessInfo from "./BusinessInfo";

// 사업자정보를 노출하는 유일한 경로.
//
// 원래는 PG·카드사 심사 요건으로 전 페이지 하단에 깔았으나, 심사가 완료되어
// 마이페이지 한 곳으로 정리했다. (2026-08 사용자 결정)
// 되돌리거나 범위를 넓히려면 이 배열에 경로를 추가하면 된다.
// 참고: 전자상거래법상 사업자 식별정보는 "초기 화면" 표시가 기준이므로,
// 그 요건까지 맞추려면 "/home" 을 추가한다.
const BUSINESS_INFO_PATHS = ["/settings"];

// 아래 화면들은 스크롤이 없는 전체화면(또는 overflow-hidden) 레이아웃이라
// 하단 여백조차 흐름을 깨므로 아무것도 렌더하지 않는다.
const EXCLUDED_PREFIXES = [
  "/onboarding", // 가입 플로우 (전체화면 스텝)
  "/auth", // OAuth 콜백 (리다이렉트 전용 화면)
  "/dev", // 개발용 트리거 페이지
  "/growth-pattern", // h-[100dvh] + overflow-hidden
  "/nursing-room", // 전체화면 지도
  // 결제 플로우(checkout/success/fail). checkout 은 자체 하단 패딩(120px)이 있고
  // 승인 대기/실패는 스쳐 지나가는 전체화면이라 여백이 필요 없다.
  "/payment",
];

function isExcluded(pathname: string) {
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // 마이페이지 하위 메뉴(/settings/*)는 각 페이지가 자체 하단 여백을 갖도록
  // 이미 손봐두었으므로 여백까지 통째로 제외한다.
  if (pathname.startsWith("/settings/")) return true;
  // 검사 응답 화면(/tests/[testId]/test/[submissionId])은 몰입형이라 제외.
  return /^\/tests\/[^/]+\/test(\/|$)/.test(pathname);
}

/**
 * 사업자정보를 걷어낸 페이지의 하단 여백.
 *
 * BusinessInfo 가 paddingBottom 으로 "콘텐츠가 하단 네비에 가리지 않게" 하는 역할까지
 * 겸하고 있었다(BusinessInfo.tsx 주석 참고). 내용만 빼고 이 여백을 그대로 두지 않으면
 * /home, /tests, /support 등 자체 하단 패딩이 없는 페이지에서 콘텐츠가 잘린다.
 */
function BottomSpacer() {
  return (
    <div aria-hidden style={{ height: "calc(var(--bottom-nav-space) + 16px)" }} />
  );
}

export default function GlobalFooter() {
  const pathname = usePathname();
  if (!pathname || isExcluded(pathname)) return null;
  if (BUSINESS_INFO_PATHS.includes(pathname)) return <BusinessInfo />;
  return <BottomSpacer />;
}
