"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    // 페이드인 완료 후 visible
    const enterTimer = setTimeout(() => setPhase("visible"), 100);
    // 일정 시간 후 페이드아웃
    const exitTimer = setTimeout(() => setPhase("exit"), 2000);
    // 페이드아웃 완료 후 onFinish
    const finishTimer = setTimeout(() => onFinish(), 2600);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500"
      style={{ opacity: phase === "exit" ? 0 : phase === "visible" ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* 아이콘 애니메이션 */}
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: phase !== "enter" ? 1 : 0,
            transform: phase !== "enter" ? "scale(1) translateY(0)" : "scale(0.5) translateY(20px)",
          }}
        >
          <div className="relative w-24 h-24">
            {/* 바운스하는 원 배경 */}
            <div className="absolute inset-0 rounded-full bg-gray-100 animate-pulse" />
            {/* 아기 이모지 */}
            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">
              👶
            </div>
          </div>
        </div>

        {/* 텍스트 애니메이션 */}
        <div
          className="flex flex-col items-center gap-2 transition-all duration-700 delay-300 ease-out"
          style={{
            opacity: phase !== "enter" ? 1 : 0,
            transform: phase !== "enter" ? "translateY(0)" : "translateY(15px)",
          }}
        >
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            아기랑
          </h1>
          <p className="text-sm text-gray-400">우리 아기의 모든 순간</p>
        </div>

        {/* 로딩 dots */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400"
              style={{
                animation: "dotBounce 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
