"use client";

import { useEffect, useState } from "react";

// [임시 디버그] 하단 네비 안 보이는 원인 확정용.
// - 화면 맨 아래 빨간 막대(fixed bottom:0): 보이면 fixed-bottom 정상.
// - 화면 맨 위 파란 막대(fixed top:0): 보이면 fixed-top 정상.
// - 중앙: innerH / screenH / vvH 값.
// 진단 끝나면 layout.tsx 에서 제거.
export default function DebugViewport() {
  const [info, setInfo] = useState("측정 중...");

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      setInfo(
        `innerH=${Math.round(window.innerHeight)} screenH=${
          window.screen.height
        } vvH=${vv ? Math.round(vv.height) : "x"}`,
      );
    }
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const bar: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    height: 28,
    zIndex: 99999,
    color: "#fff",
    fontSize: 13,
    lineHeight: "28px",
    textAlign: "center",
    fontFamily: "monospace",
    pointerEvents: "none",
  };

  return (
    <>
      <div style={{ ...bar, top: 0, background: "rgba(0,90,255,0.95)" }}>
        ▲ TOP fixed
      </div>
      <div style={{ ...bar, bottom: 0, background: "rgba(220,0,0,0.95)" }}>
        ▼ BOTTOM fixed (네비 위치)
      </div>
      <div
        style={{
          position: "fixed",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          background: "rgba(0,0,0,0.9)",
          color: "#fff",
          fontSize: 13,
          padding: "8px 12px",
          borderRadius: 8,
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        {info}
      </div>
    </>
  );
}
