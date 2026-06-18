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
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      const vh = visibleHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);

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

    return () => {
      window.removeEventListener("resize", setViewportVars);
      standaloneMq.removeEventListener("change", setViewportVars);
      window.visualViewport?.removeEventListener("resize", setViewportVars);
    };
  }, []);

  return null;
}
