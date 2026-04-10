"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"visible" | "exit">("visible");

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase("exit"), 1800);
    const finishTimer = setTimeout(() => onFinish(), 2300);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center bg-[#FDF6E3] transition-opacity duration-500"
      style={{ opacity: phase === "exit" ? 0 : 1 }}
    >
      <img
        src="/splash.png"
        alt="아기랑"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
