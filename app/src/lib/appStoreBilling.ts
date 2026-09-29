"use client";

import { useEffect, useState } from "react";

// iOS 앱(WKWebView)에서 StoreKit 인앱결제를 처리한다.
//
// WKWebView 안의 웹은 StoreKit 을 직접 부를 수 없다. 네이티브가 등록한 메시지 핸들러로
// 요청을 보내고, 네이티브가 evaluateJavaScript 로 결과를 돌려주는 구조다.
// (ios/BabyRang/BabyRang/StoreKitBridge.swift 와 짝을 이룬다)
//
// 브릿지가 없는 구 iOS 빌드에서는 결제 UI를 아예 띄우지 않는다.
// Android 의 playBilling.ts 가 Billing 없는 TWA 빌드를 다루는 방식과 같다.

/** App Store Connect 에 등록한 제품 ID. 서버 가격표의 iosSku 와 반드시 같아야 한다. */
export const TEMPERAMENT_IOS_SKU = "kr.spectrify.baby_rang.temperament_report";

/**
 * 인앱결제 노출 스위치.
 *
 * 서버의 Apple 트랜잭션 검증이 깨진 상태로 결제를 열어두면, 사용자는 실제로 990원을
 * 결제하는데 승인이 실패해 리포트가 열리지 않는다 — 돈만 나가고 환불 처리가 남는다.
 * 그런 상황이 생기면 이 값을 false 로 내리고 웹만 배포하면 즉시 결제가 숨겨진다.
 * (앱 재심사 불필요)
 */
const APP_STORE_BILLING_ENABLED = true;

/**
 * 브릿지가 없는 구 iOS 빌드에서 Toss 결제를 계속 노출할지.
 *
 * 심사원은 **새로 제출한 빌드만** 본다. 새 빌드에는 브릿지가 있으므로 인앱결제가
 * 뜨고, 심사에서 Toss 화면을 마주칠 일은 없다. 반대로 이 값을 false 로 두면
 * 새 빌드가 승인되기 전까지 iOS 매출이 0이 된다 — 아직 아무도 인앱결제를 쓸 수
 * 없는데 Toss 까지 막히기 때문이다.
 *
 * 그래서 전환 기간에는 true 로 두고, 새 빌드 보급률이 충분히 오른 뒤 false 로
 * 내린다. 그때부터 구 빌드는 결제 UI 자체가 사라진다(3.1.1 위반 상태가 끝난다).
 *
 * ⚠️ false 로 내릴 때 "웹에서 구매하세요" 같은 안내를 넣으면 안 된다.
 *    외부 결제 유도는 그 자체로 App Store 심사 지침 위반이다.
 */
export const IOS_LEGACY_TOSS_ENABLED = true;

interface BridgeWindow extends Window {
  webkit?: {
    messageHandlers?: Record<string, { postMessage: (body: unknown) => void }>;
  };
  __iapBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

type BridgeResponse =
  | { ok: true; products?: IosProduct[]; transactionId?: string }
  | { ok: false; cancelled?: boolean; message?: string };

export interface IosProduct {
  id: string;
  /** '₩990' 처럼 StoreKit 이 지역 통화로 포맷한 문자열. */
  displayPrice: string;
  displayName: string;
}

/**
 * 네이티브 브릿지를 쓸 수 있는지.
 *
 * iapPurchase 핸들러의 존재가 곧 "이 빌드는 StoreKit 연동이 들어간 버전"이라는 뜻이다.
 * 구 빌드에는 없으므로 이 한 줄로 버전 분기까지 같이 해결된다.
 */
function bridge(): BridgeWindow["webkit"] | null {
  if (!APP_STORE_BILLING_ENABLED) return null;
  if (typeof window === "undefined") return null;
  const w = window as BridgeWindow;
  return w.webkit?.messageHandlers?.iapPurchase ? w.webkit : null;
}

export function isAppStoreBillingAvailable(): boolean {
  return bridge() !== null;
}

let seq = 0;
const pending = new Map<string, (payload: BridgeResponse) => void>();

/**
 * 네이티브에 요청을 보내고 응답을 기다린다.
 *
 * ⚠️ 타임아웃을 걸지 않는다. 결제 시트는 사용자가 Face ID·비밀번호를 입력하는 동안
 * 얼마든지 열려 있을 수 있고, 우리 쪽 Promise 만 reject 해도 네이티브의 결제는
 * 계속 진행된다. 그러면 사용자는 결제됐는데 화면은 실패로 보이는 최악의 상태가 된다.
 * 네이티브는 모든 경로에서 반드시 응답을 돌려준다(StoreKitBridge.swift 참고).
 */
function call(handler: string, body: Record<string, unknown>) {
  return new Promise<BridgeResponse>((resolve, reject) => {
    const webkit = bridge();
    const target = webkit?.messageHandlers?.[handler];
    if (!target) {
      reject(new Error("결제를 사용할 수 없습니다."));
      return;
    }

    const w = window as BridgeWindow;
    if (!w.__iapBridge) {
      // 네이티브가 결과를 돌려줄 창구. 모듈이 여러 번 로드돼도 하나만 만든다.
      w.__iapBridge = {
        resolve(requestId, payload) {
          const fn = pending.get(requestId);
          if (!fn) return;
          pending.delete(requestId);
          fn(payload);
        },
      };
    }

    const requestId = `iap-${++seq}-${Date.now()}`;
    pending.set(requestId, resolve);
    target.postMessage({ ...body, requestId });
  });
}

export type IosProductState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; product: IosProduct };

/**
 * 상품 정보를 미리 받아둔다.
 *
 * Play 경로와 달리 사용자 활성화(user activation) 제약은 없지만, 상품 조회가
 * 실패하는 상황(제품이 아직 심사 전이거나 판매 국가가 맞지 않는 경우)에서
 * 결제 버튼을 보여주면 눌러도 아무 일이 없다. 조회에 성공했을 때만 노출한다.
 */
export function useAppStoreProduct(sku: string): IosProductState {
  const [state, setState] = useState<IosProductState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isAppStoreBillingAvailable()) {
        if (!cancelled) setState({ status: "unavailable" });
        return;
      }
      try {
        const res = await call("iapProducts", { productIds: [sku] });
        const product = res.ok
          ? res.products?.find((p) => p.id === sku)
          : undefined;
        if (!cancelled) {
          setState(
            product ? { status: "ready", product } : { status: "unavailable" },
          );
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
 * 결제 시트를 띄우고 트랜잭션 ID를 돌려준다.
 * 사용자가 취소하면 null 을 돌려준다(에러가 아니다).
 *
 * ⚠️ 돌려받은 트랜잭션은 아직 **완료되지 않은** 상태다.
 * 서버 승인이 끝난 뒤 반드시 finishAppStoreTransaction 을 불러야 한다.
 * 그전까지 StoreKit 은 앱을 켤 때마다 이 거래를 미완료로 다시 내려주는데,
 * 그게 곧 "결제는 됐는데 서버 저장이 실패한" 경우의 복구 경로다.
 */
export async function purchaseWithAppStore(
  sku: string,
): Promise<string | null> {
  const res = await call("iapPurchase", { productId: sku });
  if (res.ok) return res.transactionId ?? null;
  if (res.cancelled) return null;
  throw new Error(res.message ?? "결제를 완료하지 못했습니다.");
}

/**
 * 거래를 완료 처리한다. 서버 승인이 성공한 뒤에만 부를 것.
 *
 * 실패해도 사용자에게 알릴 것이 없다. 완료되지 않은 거래는 다음 실행에서
 * 다시 내려오고, 서버는 같은 트랜잭션 ID를 중복 저장하지 않는다.
 */
export function finishAppStoreTransaction(transactionId: string): void {
  const webkit = bridge();
  webkit?.messageHandlers?.iapFinish?.postMessage({ transactionId });
}
