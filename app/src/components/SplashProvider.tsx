"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import SplashScreen from "./SplashScreen";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  // unknown(판별 전) 상태에서는 children을 숨겨서 홈 화면이 먼저 보이는 것을 방지
  const [showSplash, setShowSplash] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (platform === "unknown") return;

    if (platform === "web" && !sessionStorage.getItem("splashShown")) {
      setShowSplash(true);
    }
    setResolved(true);
  }, [platform]);

  const handleFinish = useCallback(() => {
    sessionStorage.setItem("splashShown", "1");
    setShowSplash(false);
  }, []);

  // 앱/웹 판별 전에는 children을 숨김 (홈 화면 깜빡임 방지)
  if (!resolved) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      {children}
    </>
  );
}
