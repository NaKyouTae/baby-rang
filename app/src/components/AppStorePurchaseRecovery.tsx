"use client";

import { useEffect } from "react";
import { unlockResult } from "@/lib/api";
import {
  clearPendingPurchase,
  finishAppStoreTransaction,
  isAppStoreBillingAvailable,
  onAppStoreTransaction,
  readPendingPurchase,
} from "@/lib/appStoreBilling";

/**
 * 앱 밖에서 확정된 iOS 인앱결제를 조용히 마무리한다.
 *
 * 결제 시트를 거치지 않고 거래가 확정되는 경로가 있다 — 보호자가 '구입 요청'을
 * 나중에 승인하거나, 결제 도중 앱이 종료됐다가 나중에 처리가 끝나는 경우다.
 * 그 거래는 StoreKit 의 Transaction.updates 로만 전달되고, 네이티브가 이 컴포넌트로
 * 넘겨준다(StoreKitBridge.startTransactionListener).
 *
 * 이게 없으면 거래는 미완료로 남아, **사용자가 결제 버튼을 다시 눌러야만** 복구된다.
 * 이미 청구가 끝난 상태라 그 사이에는 "돈은 나갔는데 리포트가 안 열리는" 상태가 된다.
 *
 * 결제 화면이 아닌 곳에서도 받아야 하므로 루트 레이아웃에 둔다.
 * 화면에 아무것도 그리지 않는다 — 조용히 끝나는 것이 정상이다.
 */
export default function AppStorePurchaseRecovery() {
  useEffect(() => {
    if (!isAppStoreBillingAvailable()) return;

    return onAppStoreTransaction(({ transactionId, productId }) => {
      void (async () => {
        const pending = readPendingPurchase();
        // 맥락이 없으면 어떤 검사 결과에 대한 결제인지 알 수 없어 승인할 수 없다.
        // 거래는 미완료로 두고, 결제 버튼 재시도 경로에 맡긴다(추가 청구는 없다).
        if (!pending || pending.sku !== productId) return;

        try {
          const res = await fetch("/api/payments/app-store/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId,
              productType: pending.productType,
              productMeta: { submissionId: pending.submissionId },
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            orderId?: string;
          };
          if (!res.ok || !data.orderId) return;

          await unlockResult(pending.submissionId, data.orderId);

          // ⚠️ 리포트가 실제로 열린 뒤에야 거래를 완료한다.
          // 먼저 완료해 버리면 unlock 이 실패했을 때 복구할 방법이 사라진다.
          finishAppStoreTransaction(transactionId);
          clearPendingPurchase();
        } catch {
          // 네트워크 오류 등은 조용히 둔다. 거래가 미완료로 남아 있으므로
          // 다음 앱 실행이나 결제 재시도에서 다시 복구된다.
        }
      })();
    });
  }, []);

  return null;
}
