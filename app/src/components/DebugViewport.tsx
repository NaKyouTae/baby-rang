"use client";

import { useEffect, useState } from "react";

// [임시 디버그] iPad 잘림 진단용. visualViewport 값을 화면에 표시한다.
// 이게 화면에 보이면 = 최신 웹이 로드됨(WKWebView 캐시 아님).
// 진단 끝나면 layout.tsx 에서 제거할 것.
export default function DebugViewport() {
  const [info, setInfo] = useState("측정 중...");

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      // env(safe-area-inset-*) 실제 px 값 측정 (probe 엘리먼트로)
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:0;left:0;visibility:hidden;" +
        "padding-top:env(safe-area-inset-top);" +
        "padding-bottom:env(safe-area-inset-bottom);";
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const sat = parseFloat(cs.paddingTop) || 0;
      const sab = parseFloat(cs.paddingBottom) || 0;
      document.body.removeChild(probe);

      const vvHeight = vv?.height ?? window.innerHeight;
      const screenH = window.screen.height;
      const useH = screenH && screenH < vvHeight ? screenH : vvHeight;
      setInfo(
        [
          `DBG v6`,
          `innerH=${Math.round(window.innerHeight)}`,
          `vvH=${Math.round(vvHeight)}`,
          `screenH=${screenH}`,
          `useH=${Math.round(useH)}`,
          `SAT=${Math.round(sat)} SAB=${Math.round(sab)}`,
        ].join(" "),
      );
    }
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 99999,
        background: "rgba(220,0,0,0.95)",
        color: "#fff",
        fontSize: 13,
        lineHeight: "18px",
        padding: "10px 14px",
        borderRadius: 8,
        maxWidth: "90%",
        fontFamily: "monospace",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {info}
    </div>
  );
}
