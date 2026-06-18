"use client";

import { useEffect } from "react";

/**
 * 모바일 브라우저에서 100vh 문제 해결을 위한 컴포넌트.
 * visualViewport.height(없으면 innerHeight) 기반으로 --vh CSS 변수를 설정하여
 * dvh를 지원하지 않는 브라우저에서도 정확한 뷰포트 높이를 제공합니다.
 */
export default function ViewportHeightSetter() {
  useEffect(() => {
    function setViewportVars() {
      const vvHeight = window.visualViewport?.height ?? window.innerHeight;
      const screenH = window.screen.height;
      // iPad 등에서 WebView 뷰포트(innerHeight/visualViewport)가 실제 화면(screen.height)보다
      // 크게 잡혀, 화면은 뷰포트의 가운데만 보여준다(위/아래 fixed 요소가 화면 밖으로 잘림).
      // screen.height 가 더 작으면 그것을 실제 보이는 높이로 사용한다.
      const visibleHeight =
        screenH && screenH < vvHeight ? screenH : vvHeight;
      const vh = visibleHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      // 앱 셸 높이(실제 보이는 화면 높이).
      document.documentElement.style.setProperty("--app-h", `${visibleHeight}px`);

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
