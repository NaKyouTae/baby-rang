"use client";


import { usePlatform } from "@/hooks/usePlatform";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  const resolved = platform !== "unknown";

  // 앱/웹 판별 전에는 children을 숨김 (홈 화면 깜빡임 방지)
  if (!resolved) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return <>{children}</>;
}
