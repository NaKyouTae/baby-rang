"use client";

import { useEffect } from "react";

/**
 * 모바일 브라우저에서 100vh 문제 해결을 위한 컴포넌트.
 * window.innerHeight 기반으로 --vh CSS 변수를 설정하여
 * dvh를 지원하지 않는 구형 브라우저에서도 정확한 뷰포트 높이를 제공합니다.
 */
export default function ViewportHeightSetter() {
  useEffect(() => {
    function setViewportVars() {
      const vh = window.innerHeight * 0.01;
      document.body.style.setProperty("--vh", `${vh}px`);

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

    return () => {
      window.removeEventListener("resize", setViewportVars);
      standaloneMq.removeEventListener("change", setViewportVars);
    };
  }, []);

  return null;
}
