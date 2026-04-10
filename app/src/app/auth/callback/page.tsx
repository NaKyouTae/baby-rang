"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      (async () => {
        await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        try {
          const res = await fetch("/api/auth/token", { cache: "no-store" });
          const data = await res.json();
          if (data?.user && !data.user.onboardedAt) {
            window.location.replace("/onboarding");
            return;
          }
        } catch {
          /* ignore */
        }
        window.location.replace("/home");
      })();
    } else {
      window.location.replace("/");
    }
  }, [searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-dvh">
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
