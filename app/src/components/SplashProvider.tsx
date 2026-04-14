"use client";

import { useState, useEffect } from "react";
import { usePlatform } from "@/hooks/usePlatform";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (platform === "unknown") return;

    setResolved(true);
  }, [platform]);

  // 앱/웹 판별 전에는 children을 숨김 (홈 화면 깜빡임 방지)
  if (!resolved) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return <>{children}</>;
}
