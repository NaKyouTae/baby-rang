"use client";

import { useEffect } from "react";

/**
 * 모바일 브라우저에서 100vh 문제 해결을 위한 컴포넌트.
 * window.innerHeight 기반으로 --vh CSS 변수를 설정하여
 * dvh를 지원하지 않는 구형 브라우저에서도 정확한 뷰포트 높이를 제공합니다.
 */
export default function ViewportHeightSetter() {
  useEffect(() => {
    function setVh() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }

    setVh();
    window.addEventListener("resize", setVh);

    return () => window.removeEventListener("resize", setVh);
  }, []);

  return null;
}
