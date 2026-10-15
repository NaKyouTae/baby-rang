'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsAndroidApp } from '@/lib/isAndroidApp';
import { useIsIosApp } from '@/lib/isNativeApp';
import { purchaseWithPlay, usePlayProducts } from '@/lib/playBilling';
import {
  IOS_LEGACY_TOSS_ENABLED,
  clearPendingPurchase,
  finishAppStoreTransaction,
  purchaseWithAppStore,
  rememberPendingPurchase,
  useAppStoreProducts,
} from '@/lib/appStoreBilling';

/** 보석 충전 묶음. 금액·지급량·스토어 제품 ID 는 전부 서버 카탈로그가 정한다. */
export type CoinPack = {
  productType: string;
  /** 묶음 이름에 적힌 수. */
  base: number;
  /** 덤으로 더 주는 수. 0 이면 표시하지 않는다. */
  bonus: number;
  name: string;
  price: number;
  playSku: string | null;
  iosSku: string | null;
};

/**
 * 결제 수단.
 *  · 웹 브라우저                → 'toss'      (토스 결제 화면으로 이동)
 *  · Android 앱(TWA·네이티브)   → 'play'      (Play 결제 시트)
 *  · iOS 앱 + StoreKit 브릿지   → 'appStore'  (인앱결제 시트)
 *  · 어느 쪽도 쓸 수 없음        → 'none'      (결제 버튼을 막는다)
 *  · 아직 판별 전               → 'pending'   (결제 버튼을 막는다)
 *
 * ⚠️ 'none' 일 때 "웹사이트에서 구매하세요" 같은 안내나 링크를 넣으면 안 된다.
 *    외부 결제 유도는 Play·App Store 양쪽 모두에서 그 자체로 정책 위반이다.
 */
export type PayRoute = 'pending' | 'none' | 'toss' | 'play' | 'appStore';

/** 토스 결제를 마치고 돌아올 곳. 돌아오면 보석함을 다시 연다(HomeClient). */
const TOSS_RETURN = '/home?gems=1';

/**
 * 보석 충전 결제.
 *
 * 기질 리포트 결제(tests/.../result)와 같은 규칙을 따른다. 다른 점은 결제 뒤에
 * 열어줄 콘텐츠가 없다는 것뿐이다 — 결제가 저장되면 잔액을 읽을 때 서버가 적립한다.
 */
export function useCoinCheckout({
  packs,
  childId,
  onCharged,
}: {
  packs: CoinPack[] | null;
  /** 적립할 가족을 찾는 아이. 없으면(비로그인) 결제를 막는다. */
  childId?: string;
  /** 앱 결제가 끝난 뒤 잔액을 다시 읽게 한다. */
  onCharged: () => void;
}) {
  const router = useRouter();
  const isAndroidApp = useIsAndroidApp();
  const isIosApp = useIsIosApp();

  // 판별된 플랫폼의 상품만 조회한다. 웹에서 스토어를 두드릴 이유가 없다.
  const playSkus = useMemo(
    () => (isAndroidApp ? (packs ?? []).flatMap((p) => (p.playSku ? [p.playSku] : [])) : []),
    [isAndroidApp, packs],
  );
  const iosSkus = useMemo(
    () => (isIosApp ? (packs ?? []).flatMap((p) => (p.iosSku ? [p.iosSku] : [])) : []),
    [isIosApp, packs],
  );
  const play = usePlayProducts(playSkus);
  const ios = useAppStoreProducts(iosSkus);

  // 결제 시트가 떠 있는 동안 다른 묶음을 또 누르지 못하게 막는다.
  const [busy, setBusy] = useState(false);

  const routeFor = useCallback(
    (pack: CoinPack): PayRoute => {
      // 판별 전에 노출하면 앱에서 토스 결제가 한 프레임 스쳐 보일 수 있다.
      if (isAndroidApp === null || isIosApp === null) return 'pending';

      if (isAndroidApp) {
        if (play.status === 'loading') return 'pending';
        return play.status === 'ready' && pack.playSku && play.items.has(pack.playSku)
          ? 'play'
          : 'none';
      }

      if (isIosApp) {
        if (ios.status === 'loading') return 'pending';
        if (ios.status === 'ready' && pack.iosSku && ios.products.has(pack.iosSku)) {
          return 'appStore';
        }
        // 브릿지가 없는 구 빌드. 전환 기간 스위치를 따른다.
        return IOS_LEGACY_TOSS_ENABLED ? 'toss' : 'none';
      }

      return 'toss';
    },
    [isAndroidApp, isIosApp, play, ios],
  );

  /**
   * 버튼에 적을 가격.
   * 앱에서는 실제로 청구되는 스토어 가격을 보여준다. 스토어 가격표가 서버와
   * 어긋났을 때 화면과 청구액이 다르면 그 자체로 심사 거절 사유다.
   */
  const priceLabel = useCallback(
    (pack: CoinPack) => {
      const won = (n: number) => `${n.toLocaleString()}원`;
      const route = routeFor(pack);
      if (route === 'play' && play.status === 'ready' && pack.playSku) {
        const item = play.items.get(pack.playSku);
        const value = Number(item?.price.value);
        if (item?.price.currency === 'KRW' && Number.isFinite(value)) return won(value);
      }
      if (route === 'appStore' && ios.status === 'ready' && pack.iosSku) {
        const shown = ios.products.get(pack.iosSku)?.displayPrice;
        // StoreKit 은 '₩1,200' 처럼 준다. 화면 표기(1,200원)에 맞춘다.
        if (shown) return shown.replace(/^₩\s?(.+)$/, '$1원');
      }
      return won(pack.price);
    },
    [routeFor, play, ios],
  );

  const buyWithPlay = async (pack: CoinPack, cid: string) => {
    if (play.status !== 'ready' || !pack.playSku) return;
    const item = play.items.get(pack.playSku);
    if (!item) return;

    // 결제 도중 앱이 죽어도 어느 가족에게 적립할지 알 수 있게 남겨둔다.
    // 승인이 끝나지 않은 구매를 AndroidPurchaseRecovery 가 이 맥락으로 마무리한다.
    rememberPendingPurchase({ sku: pack.playSku, productType: pack.productType, childId: cid });

    const purchaseToken = await purchaseWithPlay(pack.playSku, item);
    // 사용자가 결제 시트를 닫은 경우 — 에러가 아니다.
    if (!purchaseToken) {
      clearPendingPurchase();
      return;
    }

    const res = await fetch('/api/payments/google-play/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: pack.playSku,
        purchaseToken,
        productType: pack.productType,
        childId: cid,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.orderId) throw new Error(data?.message ?? '결제 승인에 실패했습니다.');

    clearPendingPurchase();
    onCharged();
  };

  const buyWithAppStore = async (pack: CoinPack, cid: string) => {
    if (!pack.iosSku) return;

    // 결제 도중 앱이 죽어도 어느 가족에게 적립할지 알 수 있게 남겨둔다.
    // 나중에 확정된 거래를 AppStorePurchaseRecovery 가 이 맥락으로 마무리한다.
    rememberPendingPurchase({ sku: pack.iosSku, productType: pack.productType, childId: cid });

    const transactionId = await purchaseWithAppStore(pack.iosSku);
    // 사용자가 결제 시트를 닫은 경우 — 에러가 아니다.
    if (!transactionId) {
      clearPendingPurchase();
      return;
    }

    const res = await fetch('/api/payments/app-store/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, productType: pack.productType, childId: cid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.orderId) throw new Error(data?.message ?? '결제 승인에 실패했습니다.');

    // ⚠️ 서버에 결제가 저장된 뒤에야 거래를 완료한다.
    // 먼저 완료하면 승인이 실패했을 때 다시 눌러도 새 결제가 진행된다(소모품이라
    // StoreKit 이 막아주지 않는다). 미완료로 두면 같은 거래가 재사용된다.
    finishAppStoreTransaction(transactionId);
    clearPendingPurchase();
    onCharged();
  };

  const buyWithToss = (pack: CoinPack, cid: string) => {
    const qs = new URLSearchParams({
      productType: pack.productType,
      productName: pack.name,
      amount: String(pack.price),
      childId: cid,
      redirectTo: TOSS_RETURN,
    });
    router.push(`/payment/checkout?${qs.toString()}`);
  };

  const buy = async (pack: CoinPack) => {
    if (busy) return;
    if (!childId) {
      alert('로그인 후 충전할 수 있습니다.');
      return;
    }
    const route = routeFor(pack);
    if (route === 'toss') {
      buyWithToss(pack, childId);
      return;
    }
    if (route !== 'play' && route !== 'appStore') return;

    setBusy(true);
    try {
      if (route === 'play') await buyWithPlay(pack, childId);
      else await buyWithAppStore(pack, childId);
    } catch (e) {
      alert(e instanceof Error ? e.message : '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return { routeFor, priceLabel, buy, busy };
}
