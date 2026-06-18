"use client";

import { useEffect } from "react";

/**
 * 모바일/iPad WebView에서 정확한 "보이는 영역" 높이를 --vh CSS 변수로 설정.
 *
 * visualViewport.height 를 우선 사용한다 — iPad 호환 모드(아이폰 앱)에서는
 * layout viewport 가 보이는 창보다 커서 100vh/100dvh 가 실제 보이는 높이보다
 * 크게 잡히고, 그 결과 fixed 하단 네비/상단 헤더가 화면 밖으로 잘린다.
 * visualViewport.height 는 실제 보이는 영역을 정확히 반환하므로 이를 기준으로 한다.
 */
export default function ViewportHeightSetter() {
  useEffect(() => {
    function setViewportVars() {
      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;
      const screenH = window.screen.height;
      // iPad 호환 모드: WebView 뷰포트(vvHeight, innerHeight)가 실제 화면(screen.height)보다
      // 크게 잡혀, 콘텐츠가 화면보다 길게 배치되고 하단 네비/헤더가 화면 밖으로 잘린다.
      // (예: screen.height=667 인데 innerHeight=812) visualViewport 도 812 로 거짓 보고하므로,
      // screen.height 가 더 작을 때는 그 값을 실제 보이는 높이로 사용한다.
      const visibleHeight =
        screenH && screenH < vvHeight ? screenH : vvHeight;
      const vh = visibleHeight * 0.01;
      const root = document.documentElement.style;
      root.setProperty("--vh", `${vh}px`);

      // 앱 셸을 실제 보이는 영역에 맞추기 위한 변수.
      root.setProperty("--vv-top", `${vv?.offsetTop ?? 0}px`);
      root.setProperty("--vv-left", `${vv?.offsetLeft ?? 0}px`);
      root.setProperty("--vv-width", `${vv?.width ?? window.innerWidth}px`);
      root.setProperty("--vv-height", `${visibleHeight}px`);

      // Android Chrome 홈화면 추가(standalone)에서는
      // 브라우저 하단 UI가 없는데도 inset이 남는 경우가 있어 0으로 보정.
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const isAndroid = /android/i.test(window.navigator.userAgent);

      if (isStandalone && isAndroid) {
        document.documentElement.style.setProperty("--safe-area-bottom", "0px");
      } else {
        document.documentElement.style.removeProperty("--safe-area-bottom");
      }
    }

    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    setViewportVars();
    window.addEventListener("resize", setViewportVars);
    standaloneMq.addEventListener("change", setViewportVars);
    window.visualViewport?.addEventListener("resize", setViewportVars);
    window.visualViewport?.addEventListener("scroll", setViewportVars);

    return () => {
      window.removeEventListener("resize", setViewportVars);
      standaloneMq.removeEventListener("change", setViewportVars);
      window.visualViewport?.removeEventListener("resize", setViewportVars);
      window.visualViewport?.removeEventListener("scroll", setViewportVars);
    };
  }, []);

  return null;
}
