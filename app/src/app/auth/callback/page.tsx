"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then(() => {
        window.location.replace("/home");
      });
    } else {
      window.location.replace("/login");
    }
  }, [searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <p className="text-gray-500">로그인 중...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
