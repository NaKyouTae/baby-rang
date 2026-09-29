"use client";

import { useEffect } from "react";
import { unlockResult } from "@/lib/api";
import {
  isAndroidBillingAvailable,
  restoreAndroidPurchases,
} from "@/lib/androidBilling";
// 결제 맥락(어떤 검사 결과에 대한 결제인지)을 담는 헬퍼는 플랫폼과 무관하다.
// iOS 쪽 모듈에 있지만 저장 형식이 같아 그대로 쓴다.
import {
  clearPendingPurchase,
  readPendingPurchase,
} from "@/lib/appStoreBilling";

/**
 * 서버 승인이 끝나지 않은 Android 결제를 조용히 마무리한다.
 *
 * 결제 직후 앱이 죽거나 네트워크가 끊기면 "돈은 나갔는데 리포트는 안 열린" 상태가 된다.
 * 서버가 consume 할 때까지 구매는 Play 에 남아 있으므로, 앱을 다시 켤 때 그걸 찾아
 * 승인을 이어서 끝낸다. iOS 의 AppStorePurchaseRecovery 와 같은 역할이다.
 *
 * ⚠️ 방치하면 Play 가 3일 뒤 자동 환불한다. 사용자는 그동안 돈만 낸 상태가 된다.
 *
 * iOS 는 StoreKit 이 미완료 거래를 밀어주지만(Transaction.updates), Play 는
 * 조회해서 가져와야 하므로 마운트 시점에 한 번 확인한다.
 *
 * 결제 화면이 아닌 곳에서도 복구해야 하므로 루트 레이아웃에 둔다.
 * 화면에 아무것도 그리지 않는다 — 조용히 끝나는 것이 정상이다.
 */
export default function AndroidPurchaseRecovery() {
  useEffect(() => {
    if (!isAndroidBillingAvailable()) return;

    let cancelled = false;

    void (async () => {
      const pending = readPendingPurchase();
      // 맥락이 없으면 어떤 검사 결과에 대한 결제인지 알 수 없어 승인할 수 없다.
      // 구매는 Play 에 남겨두고, 결제 버튼 재시도 경로에 맡긴다(추가 청구는 없다).
      if (!pending) return;

      const purchases = await restoreAndroidPurchases();
      if (cancelled) return;

      const match = purchases.find((p) => p.productId === pending.sku);
      if (!match) return;

      try {
        const res = await fetch("/api/payments/google-play/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: match.productId,
            purchaseToken: match.purchaseToken,
            productType: pending.productType,
            productMeta: { submissionId: pending.submissionId },
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          orderId?: string;
        };
        if (!res.ok || !data.orderId) return;

        await unlockResult(pending.submissionId, data.orderId);
        clearPendingPurchase();
      } catch {
        // 네트워크 오류 등은 조용히 둔다. 구매가 Play 에 남아 있으므로
        // 다음 앱 실행이나 결제 재시도에서 다시 복구된다.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
