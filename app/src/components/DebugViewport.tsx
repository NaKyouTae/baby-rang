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
      setInfo(
        [
          `DBG v3`,
          `innerH=${Math.round(window.innerHeight)}`,
          `vvH=${vv ? Math.round(vv.height) : "x"}`,
          `vvT=${vv ? Math.round(vv.offsetTop) : "x"}`,
          `vvScale=${vv ? vv.scale.toFixed(2) : "x"}`,
          `dpr=${window.devicePixelRatio}`,
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
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "rgba(220,0,0,0.9)",
        color: "#fff",
        fontSize: 11,
        lineHeight: "16px",
        padding: "2px 6px",
        fontFamily: "monospace",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {info}
    </div>
  );
}
