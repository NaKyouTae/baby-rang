"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("token");

    if (accessToken) {
      (async () => {
        await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: accessToken }),
        });
        window.location.replace("/home");
      })();
      return;
    }

    window.location.replace("/");
  }, [searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-dvh">
      <p className="text-gray-500">로그인하는 중</p>
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
