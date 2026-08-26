"use client";

import { useEffect, useState } from "react";

// Android(TWA)에서 Digital Goods API 로 Google Play 결제를 처리한다.
//
// 이 경로는 TWA 빌드에 playBilling 이 켜져 있어야만 동작한다. versionCode 7 이하처럼
// Billing 이 없는 빌드에서는 getDigitalGoodsService 자체가 없거나 실패하므로,
// 사용 가능 여부를 먼저 확인하고 안 되면 결제 UI를 아예 띄우지 않는다(Phase 1 동작).

const PLAY_BILLING_METHOD = "https://play.google.com/billing";

/** Play Console 에 등록한 일회성 제품 ID. 서버 가격표의 playSku 와 반드시 같아야 한다. */
export const TEMPERAMENT_SKU = "temperament_report";

interface ItemDetails {
  itemId: string;
  title: string;
  price: { currency: string; value: string };
}

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>;
}

type WindowWithDigitalGoods = Window & {
  getDigitalGoodsService?: (
    serviceProvider: string,
  ) => Promise<DigitalGoodsService>;
};

/** Play 결제를 쓸 수 있으면 서비스를, 아니면 null 을 돌려준다. */
export async function getPlayBillingService(): Promise<DigitalGoodsService | null> {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithDigitalGoods;
  if (typeof w.getDigitalGoodsService !== "function") return null;
  try {
    return await w.getDigitalGoodsService(PLAY_BILLING_METHOD);
  } catch {
    // Billing 이 꺼진 빌드이거나 Play 스토어를 쓸 수 없는 기기.
    return null;
  }
}

/**
 * Play 결제 사용 가능 여부.
 *
 * `null` 은 아직 판별 전이다. 결제 UI는 `true` 로 확정된 뒤에만 노출해야
 * "버튼은 보이는데 눌러도 아무 일이 없는" 상태를 피할 수 있다.
 */
export function usePlayBillingAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPlayBillingService().then((service) => {
      if (!cancelled) setAvailable(service !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}

/**
 * Play 결제창을 띄우고 구매 토큰을 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 */
export async function purchaseWithPlay(sku: string): Promise<string | null> {
  const service = await getPlayBillingService();
  if (!service) throw new Error("이 기기에서는 결제를 사용할 수 없습니다.");

  const details = await service.getDetails([sku]);
  const item = details.find((d) => d.itemId === sku) ?? details[0];
  if (!item) {
    // 상품이 Play Console 에서 비활성이거나 국가/트랙이 맞지 않는 경우.
    throw new Error("상품 정보를 불러오지 못했습니다.");
  }

  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }],
    { total: { label: item.title, amount: item.price } },
  );

  try {
    const response = await request.show();
    const { purchaseToken } = response.details as { purchaseToken?: string };
    if (!purchaseToken) {
      await response.complete("fail");
      throw new Error("구매 정보를 확인하지 못했습니다.");
    }
    // complete() 를 부르지 않으면 결제 시트가 닫히지 않는다.
    await response.complete("success");
    return purchaseToken;
  } catch (e) {
    // 사용자가 시트를 닫으면 AbortError 가 난다. 실패로 다루지 않는다.
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}
