"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAndroidApp } from "@/lib/isAndroidApp";

/**
 * Android(TWA) 앱에서 결제 화면으로 들어오는 경로를 차단한다.
 *
 * 결과 페이지에서 결제 CTA를 감췄더라도 URL로 직접 진입하면 결제 위젯이 열린다.
 * Play 심사원이 URL을 눌러보는 경우까지 막아야 하므로 라우트 단에서 한 번 더 잠근다.
 *
 * 웹 브라우저와 iOS 앱은 영향을 받지 않는다.
 */
export default function PaymentRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAndroidApp = useIsAndroidApp();

  useEffect(() => {
    if (isAndroidApp === true) router.replace("/home");
  }, [isAndroidApp, router]);

  // 판별 전(null)에도 렌더하지 않는다.
  // 앱에서 결제 위젯이 한 프레임이라도 스쳐 보이면 안 되기 때문이다.
  if (isAndroidApp !== false) return null;

  return <>{children}</>;
}
