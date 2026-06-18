"use client";

import { useEffect, useState } from "react";

// [임시 디버그] iPad 잘림 진단용 눈금자.
// 화면 좌측에 fixed 로 50px 간격 눈금을 그린다. 보이는 가장 큰 숫자 = 실제 보이는 높이.
// 진단 끝나면 layout.tsx 에서 제거할 것.
export default function DebugViewport() {
  const [info, setInfo] = useState("측정 중...");

  useEffect(() => {
    function update() {
      const vv = window.visualViewport;
      setInfo(
        `innerH=${Math.round(window.innerHeight)} vvH=${
          vv ? Math.round(vv.height) : "x"
        } screenH=${window.screen.height} availH=${window.screen.availHeight}`,
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

  // 0~900px, 50px 간격 눈금
  const ticks = Array.from({ length: 19 }, (_, i) => i * 50);

  return (
    <>
      {/* 값 표시 (중앙) */}
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          background: "rgba(220,0,0,0.95)",
          color: "#fff",
          fontSize: 12,
          padding: "8px 12px",
          borderRadius: 8,
          fontFamily: "monospace",
          textAlign: "center",
          pointerEvents: "none",
          maxWidth: "92%",
        }}
      >
        DBG-RULER {info}
      </div>
      {/* 눈금자: fixed, 뷰포트 기준. 보이는 가장 큰 숫자가 실제 보이는 높이 */}
      {ticks.map((y) => (
        <div
          key={y}
          style={{
            position: "fixed",
            top: `${y}px`,
            left: 0,
            zIndex: 99998,
            background: y % 100 === 0 ? "rgba(0,120,255,0.9)" : "rgba(0,120,255,0.5)",
            color: "#fff",
            fontSize: 10,
            lineHeight: "12px",
            padding: "0 4px",
            fontFamily: "monospace",
            pointerEvents: "none",
          }}
        >
          {y}
        </div>
      ))}
    </>
  );
}
