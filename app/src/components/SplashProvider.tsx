"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import SplashScreen from "./SplashScreen";

export default function SplashProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSplash, setShowSplash] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!sessionStorage.getItem("splashShown")) {
      setShowSplash(true);
    }
  }, [pathname]);

  const handleFinish = useCallback(() => {
    sessionStorage.setItem("splashShown", "1");
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      <div style={{ visibility: showSplash ? "hidden" : "visible" }}>
        {children}
      </div>
    </>
  );
}
