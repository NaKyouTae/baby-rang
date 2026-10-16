"use client";

import { usePathname } from "next/navigation";

// 사업자정보는 홈의 마이페이지(MyPage) 하단에 있다. 여기서는 하단 여백만 깐다.

// 아래 화면들은 스크롤이 없는 전체화면(또는 overflow-hidden) 레이아웃이라
// 하단 여백조차 흐름을 깨므로 아무것도 렌더하지 않는다.
const EXCLUDED_PREFIXES = [
  "/additional-info", // 추가 정보 확인 (전체화면 흐름)
  "/login", // 로그인 진입 (전체화면 흐름)
  "/auth", // OAuth 콜백 (리다이렉트 전용 화면)
  "/home", // 픽셀 홈 (전체화면). 사업자정보는 홈의 설정 화면 하단에 있다.
  "/growth-pattern", // h-[100dvh] + overflow-hidden
  "/physical-growth", // 화면 높이에 고정, 목록만 내부 스크롤
  "/wonder-weeks", // 픽셀 원더윅스 (전체화면, 안쪽만 스크롤)
  // 결제 플로우(checkout/success/fail). checkout 은 자체 하단 패딩(120px)이 있고
  // 승인 대기/실패는 스쳐 지나가는 전체화면이라 여백이 필요 없다.
  "/payment",
  "/terms", // 픽셀 약관 화면. 자체 하단 여백이 있다.
  "/refund", // 픽셀 환불정책 화면. 자체 하단 여백이 있다.
];

function isExcluded(pathname: string) {
  // 루트는 /home 과 같은 화면이다. 접두어 목록에 "/" 를 넣으면 전부 걸리므로 따로 본다.
  if (pathname === "/") return true;
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // 마이페이지 하위 메뉴(/settings/*)는 각 페이지가 자체 하단 여백을 갖도록
  // 이미 손봐두었으므로 여백까지 통째로 제외한다.
  return pathname.startsWith("/settings/");
}

/**
 * 사업자정보를 걷어낸 페이지의 하단 여백.
 *
 * BusinessInfo 가 paddingBottom 으로 "콘텐츠가 하단 네비에 가리지 않게" 하는 역할까지
 * 겸하고 있었다(BusinessInfo.tsx 주석 참고). 내용만 빼고 이 여백을 그대로 두지 않으면
 * /support 등 자체 하단 패딩이 없는 페이지에서 콘텐츠가 잘린다.
 */
function BottomSpacer() {
  return (
    <div aria-hidden style={{ height: "calc(var(--bottom-nav-space) + 16px)" }} />
  );
}

export default function GlobalFooter() {
  const pathname = usePathname();
  if (!pathname || isExcluded(pathname)) return null;
  return <BottomSpacer />;
}
