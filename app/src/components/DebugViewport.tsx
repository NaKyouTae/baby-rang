"use client";

import { useEffect, useState } from "react";

// [임시 디버그] 셸 높이 적용 확인용. 진단 끝나면 layout.tsx 에서 제거.
export default function DebugViewport() {
  const [info, setInfo] = useState("측정 중...");

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;
      const screenH = window.screen.height;
      const appH = screenH && screenH < vvHeight ? screenH : vvHeight;
      setInfo(
        `FIX2 innerH=${Math.round(window.innerHeight)} screenH=${screenH} appH=${Math.round(appH)}`,
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

  return (
    <div
      style={{
        position: "fixed",
        top: "45%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 99999,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 6,
        fontFamily: "monospace",
        pointerEvents: "none",
      }}
    >
      {info}
    </div>
  );
}
