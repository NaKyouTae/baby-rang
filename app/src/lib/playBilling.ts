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

/**
 * Play 결제 노출 스위치.
 *
 * 서버의 Play 구매 검증이 깨진 상태에서 결제를 열어두면, 사용자는 실제로 990원을
 * 결제하는데 승인이 실패해 리포트가 열리지 않는다 — 돈만 나가고 환불 처리가 남는다.
 * 그런 상황이 생기면 이 값을 false 로 내리고 웹만 배포하면 즉시 결제가 숨겨진다.
 * (AAB 재빌드 불필요. 결제 UI는 Phase 1 동작으로 되돌아간다)
 */
const PLAY_BILLING_ENABLED = true;

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
  if (!PLAY_BILLING_ENABLED) return null;
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
 * Play 상품 정보를 미리 받아둔다.
 *
 * ⚠️ 클릭 핸들러 안에서 상품을 조회하면 안 된다.
 * PaymentRequest.show() 는 사용자 활성화(user activation)가 살아 있을 때만 결제 시트를
 * 띄운다. 클릭 후 getDigitalGoodsService() → getDetails() 로 두 번 await 하면 그 사이
 * 활성화가 만료돼, 아무 에러 없이 조용히 멈춰버린다.
 * 그래서 마운트 시점에 미리 받아두고, 클릭 시에는 곧바로 show() 만 부른다.
 *
 * status 가 'ready' 일 때만 결제 UI를 노출한다.
 */
export type PlayProductState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; item: ItemDetails };

export function usePlayProduct(sku: string): PlayProductState {
  const [state, setState] = useState<PlayProductState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const service = await getPlayBillingService();
      if (!service) {
        if (!cancelled) setState({ status: "unavailable" });
        return;
      }
      try {
        const details = await service.getDetails([sku]);
        const item = details.find((d) => d.itemId === sku) ?? details[0];
        if (!cancelled) {
          // 상품이 Play Console 에서 비활성이거나 트랙·국가가 맞지 않으면 빈 배열이 온다.
          setState(item ? { status: "ready", item } : { status: "unavailable" });
        }
      } catch {
        if (!cancelled) setState({ status: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sku]);

  return state;
}

/**
 * Play 결제창을 띄우고 구매 토큰을 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 *
 * item 은 usePlayProduct 로 미리 받아둔 값을 넘겨야 한다. 여기서 조회하면
 * 사용자 활성화가 끊겨 결제 시트가 뜨지 않는다.
 */
/**
 * 임시 진단용. 앱(WebView)에서는 콘솔도 못 보고 React 모달도 레이어에 가릴 수 있어서,
 * 무엇에도 가려지지 않는 alert 로 진행 단계를 찍는다.
 * Play 결제가 정상 동작하는 것을 확인하면 이 함수와 호출부를 지운다.
 */
function step(message: string) {
  if (typeof window !== "undefined") window.alert(`[결제] ${message}`);
}

export async function purchaseWithPlay(
  sku: string,
  item: ItemDetails,
): Promise<string | null> {
  step(`1. 시작\nsku=${sku}\n${item.price.currency} ${item.price.value}`);

  let request: PaymentRequest;
  try {
    request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }],
      { total: { label: item.title, amount: item.price } },
    );
  } catch (e) {
    const err = e as { name?: string; message?: string };
    step(`2-X. PaymentRequest 생성 실패\n${err?.name}\n${err?.message}`);
    throw e;
  }

  // 이 결제수단을 처리할 앱이 있는지 확인한다. false 면 PaymentActivity 를
  // Chrome 이 못 찾는다는 뜻이라, show() 가 조용히 멈추는 원인이 특정된다.
  try {
    const can = await request.canMakePayment();
    step(`2. PaymentRequest 생성됨\ncanMakePayment = ${can}`);
  } catch (e) {
    const err = e as { name?: string; message?: string };
    step(`2-E. canMakePayment 실패\n${err?.name}\n${err?.message}`);
  }

  try {
    step("3. show() 호출 직전");
    // show() 는 결제 시트가 뜨지 못하면 아무 예외 없이 영원히 대기한다.
    // (Chrome 이 PaymentActivity 로 넘긴 뒤 응답이 없는 경우가 대표적이다)
    // 그대로 두면 "결제를 진행하고 있어요"에서 멈춘 채 원인을 알 수 없으므로,
    // 일정 시간이 지나면 진단 가능한 오류로 바꿔준다.
    const response = await Promise.race([
      request.show(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "결제창이 열리지 않았습니다. (25초 초과) Play 스토어 앱이 최신인지 확인해 주세요.",
              ),
            ),
          25_000,
        ),
      ),
    ]);
    step("4. show() 완료 — 결제 시트 종료됨");
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
    if (e instanceof DOMException && e.name === "AbortError") {
      step("4-C. 사용자가 결제를 취소함");
      return null;
    }
    const err = e as { name?: string; message?: string };
    step(`4-X. show() 실패\n${err?.name}\n${err?.message}`);
    throw e;
  }
}
