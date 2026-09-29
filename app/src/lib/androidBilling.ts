"use client";

// 네이티브 Android 앱(WebView)에서 Google Play 결제를 처리한다.
//
// WebView 안의 웹은 Play Billing 을 직접 부를 수 없다. 네이티브가 등록한
// @JavascriptInterface 로 요청을 보내고, 네이티브가 evaluateJavascript 로
// 결과를 돌려주는 구조다. (android/app/.../BillingManager.kt 와 짝을 이룬다)
//
// TWA 는 Digital Goods API 를 쓴다(playBilling.ts). 두 경로는 서로 배타적이다 —
// TWA 에는 이 브리지가 없고, 네이티브 앱에는 getDigitalGoodsService 가 없다.

/** 브리지가 돌려주는 상품 정보. playBilling 의 ItemDetails 와 같은 모양으로 맞춘다. */
export interface AndroidItem {
  itemId: string;
  title: string;
  currency: string;
  value: string;
}

type BridgeResponse =
  | { ok: true; products?: AndroidItem[]; purchaseToken?: string; purchases?: RestoredPurchase[] }
  | { ok: false; cancelled?: boolean; message?: string };

export interface RestoredPurchase {
  productId: string;
  purchaseToken: string;
}

interface BridgeWindow extends Window {
  Android?: {
    billingProducts?: (json: string) => void;
    billingPurchase?: (json: string) => void;
    billingRestore?: (json: string) => void;
  };
  __playBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

/**
 * 네이티브 결제 브리지를 쓸 수 있는지.
 *
 * billingPurchase 의 존재가 곧 "이 빌드는 Play Billing 연동이 들어간 버전"이라는 뜻이다.
 * 구 빌드에는 없으므로 이 한 줄로 버전 분기까지 같이 해결된다.
 */
export function isAndroidBillingAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as BridgeWindow).Android?.billingPurchase === "function";
}

let seq = 0;
const pending = new Map<string, (payload: BridgeResponse) => void>();

/**
 * 네이티브에 요청을 보내고 응답을 기다린다.
 *
 * ⚠️ 타임아웃을 걸지 않는다. 결제 시트는 사용자가 인증하는 동안 얼마든지 열려 있을 수
 * 있고, 우리 쪽 Promise 만 reject 해도 네이티브의 결제는 계속 진행된다. 그러면
 * 사용자는 결제됐는데 화면은 실패로 보이는 최악의 상태가 된다.
 * 네이티브는 모든 경로에서 반드시 응답을 돌려준다(BillingManager.kt 참고).
 */
function call(
  method: "billingProducts" | "billingPurchase" | "billingRestore",
  body: Record<string, unknown>,
) {
  return new Promise<BridgeResponse>((resolve, reject) => {
    const w = window as BridgeWindow;
    const target = w.Android?.[method];
    if (typeof target !== "function") {
      reject(new Error("결제를 사용할 수 없습니다."));
      return;
    }

    if (!w.__playBridge) {
      // 네이티브가 결과를 돌려줄 창구. 모듈이 여러 번 로드돼도 하나만 만든다.
      w.__playBridge = {
        resolve(requestId, payload) {
          const fn = pending.get(requestId);
          if (!fn) return;
          pending.delete(requestId);
          fn(payload);
        },
      };
    }

    const requestId = `play-${++seq}-${Date.now()}`;
    pending.set(requestId, resolve);
    // ⚠️ @JavascriptInterface 는 JS 객체를 못 받는다. JSON 문자열로 넘긴다.
    //    수신 객체(window.Android)를 유지한 채 호출해야 한다.
    w.Android?.[method]?.(JSON.stringify({ ...body, requestId }));
  });
}

/** 상품 정보를 조회한다. 없으면 null. */
export async function fetchAndroidProduct(
  sku: string,
): Promise<AndroidItem | null> {
  const res = await call("billingProducts", { productIds: [sku] });
  if (!res.ok) return null;
  return res.products?.find((p) => p.itemId === sku) ?? null;
}

/**
 * 결제 시트를 띄우고 구매 토큰을 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 *
 * ⚠️ 돌려받은 구매는 아직 **확정되지 않은** 상태다.
 * 서버가 Play Developer API 로 consume 하면서 확정한다.
 * 3일 안에 확정되지 않으면 Play 가 자동 환불한다.
 */
export async function purchaseWithAndroid(sku: string): Promise<string | null> {
  const res = await call("billingPurchase", { productId: sku });
  if (res.ok) return res.purchaseToken ?? null;
  if (res.cancelled) return null;
  throw new Error(res.message ?? "결제를 완료하지 못했습니다.");
}

/**
 * 서버 승인이 끝나지 않은 구매를 돌려준다.
 *
 * 결제 직후 앱이 죽거나 네트워크가 끊기면 "돈은 나갔는데 리포트는 안 열린" 상태가 된다.
 * 서버가 consume 할 때까지 구매는 Play 에 남아 있으므로 이걸로 복구한다.
 */
export async function restoreAndroidPurchases(): Promise<RestoredPurchase[]> {
  try {
    const res = await call("billingRestore", {});
    return res.ok ? (res.purchases ?? []) : [];
  } catch {
    return [];
  }
}
