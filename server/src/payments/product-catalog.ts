import { BadRequestException } from '@nestjs/common';
import { PaymentProductType } from '@prisma/client';

// 유료 상품의 가격과 이름은 **서버가 정한다.**
//
// 클라이언트가 보낸 amount 를 그대로 믿으면, 결제 화면 URL의 쿼리스트링
// (/payment/checkout?amount=990) 을 100 으로 바꾸는 것만으로 정가보다 싸게
// 결제하고 유료 콘텐츠를 열 수 있다. PG 승인 자체는 위젯에 설정된 금액으로
// 정상 처리되기 때문에 PG 쪽에서는 걸러지지 않는다.
//
// ⚠️ 프론트(app/src/app/tests/[testId]/result/[submissionId]/page.tsx 의
// TEMPERAMENT_PRICE)와 값이 어긋나면 모든 결제가 거부된다. 가격을 바꿀 때는
// 양쪽을 함께 수정할 것.

export interface ProductSpec {
  /** 영수증·결제 내역에 남는 상품명. 클라이언트가 보낸 값 대신 이걸 쓴다. */
  name: string;
  /** 정가(KRW). */
  price: number;
  /**
   * Play Console 에 등록한 일회성 제품 ID.
   * ⚠️ 콘솔에서 한 번 만들면 바꿀 수 없으므로 값이 정확해야 한다.
   */
  playSku?: string;
  /**
   * App Store Connect 에 등록한 앱 내 구입 제품 ID.
   * ⚠️ Play 와 달리 앱 번들 ID(kr.spectrify.baby-rang)와 철자가 다르다.
   *    제품 ID 는 Android 패키지명을 따라 baby_rang(언더스코어)으로 만들어졌다.
   *    번들 ID 검증(app-store.service.ts)과 혼동하지 말 것.
   * ⚠️ 콘솔에서 한 번 만들면 바꿀 수 없다. 삭제해도 같은 문자열을 다시 쓸 수 없다.
   */
  iosSku?: string;
}

/**
 * 판매 중인 상품 목록.
 *
 * 여기에 없는 상품 타입은 결제 자체가 거부된다.
 * (OTHER 처럼 금액을 자유롭게 넣을 수 있는 통로를 남기면 검증이 무의미해진다.)
 */
export const PRODUCT_CATALOG: Partial<Record<PaymentProductType, ProductSpec>> =
  {
    // 꾸미기 재화(보석) 충전.
    //
    // ⚠️ 금액과 지급량은 서버만 믿는다. 클라이언트가 보낸 수량으로 적립하면
    //    요청 본문만 고쳐서 공짜로 보석을 받을 수 있다.
    // ⚠️ 보석 1개는 광고를 보고 받는 보상이라 결제 상품이 아니다.
    COINS_10: {
      name: '보석 10개',
      price: 1200,
      playSku: 'coins_10',
      iosSku: 'kr.spectrify.baby_rang.coins_10',
    },
    COINS_20: {
      name: '보석 20개',
      price: 2400,
      playSku: 'coins_20',
      iosSku: 'kr.spectrify.baby_rang.coins_20',
    },
    COINS_30: {
      name: '보석 30개',
      price: 3600,
      playSku: 'coins_30',
      iosSku: 'kr.spectrify.baby_rang.coins_30',
    },
    COINS_50: {
      name: '보석 50개',
      price: 6000,
      playSku: 'coins_50',
      iosSku: 'kr.spectrify.baby_rang.coins_50',
    },
    COINS_100: {
      name: '보석 100개',
      price: 12000,
      playSku: 'coins_100',
      iosSku: 'kr.spectrify.baby_rang.coins_100',
    },
    COINS_200: {
      name: '보석 200개',
      price: 24000,
      playSku: 'coins_200',
      iosSku: 'kr.spectrify.baby_rang.coins_200',
    },
    COINS_300: {
      name: '보석 300개',
      price: 36000,
      playSku: 'coins_300',
      iosSku: 'kr.spectrify.baby_rang.coins_300',
    },
    TEMPERAMENT_REPORT: {
      name: '기질 검사 상세 리포트',
      price: 990,
      playSku: 'temperament_report',
      iosSku: 'kr.spectrify.baby_rang.temperament_report',
    },
    // WONDER_WEEKS_PREMIUM, NURSING_ROOM_PREMIUM 은 아직 판매하지 않는다.
    // 출시할 때 여기에 가격을 등록해야 결제가 열린다.
  };

/** 판매 중인 상품이면 사양을 돌려주고, 아니면 거부한다. */
export function getProductSpec(productType: PaymentProductType): ProductSpec {
  const spec = PRODUCT_CATALOG[productType];
  if (!spec) {
    throw new BadRequestException(
      `현재 판매 중인 상품이 아닙니다. (${productType})`,
    );
  }
  return spec;
}

/**
 * Play 제품 ID로 상품을 역조회한다.
 *
 * 클라이언트가 productType 을 함께 보내더라도 그 값을 믿지 않는다.
 * 구매 토큰은 특정 Play 제품에 묶여 있으므로, 제품 ID가 곧 어떤 상품을 샀는지의
 * 유일한 근거다. 여기서 상품을 확정해야 "싼 상품을 사고 비싼 콘텐츠를 여는" 경로가 막힌다.
 */
export function resolveByPlaySku(sku: string): {
  productType: PaymentProductType;
  spec: ProductSpec;
} {
  for (const [type, spec] of Object.entries(PRODUCT_CATALOG)) {
    if (spec?.playSku && spec.playSku === sku) {
      return { productType: type as PaymentProductType, spec };
    }
  }
  throw new BadRequestException(`알 수 없는 Play 상품입니다. (${sku})`);
}

/**
 * App Store 제품 ID로 상품을 역조회한다.
 *
 * resolveByPlaySku 와 같은 이유로 클라이언트가 보낸 productType 을 믿지 않는다.
 * 트랜잭션은 특정 App Store 제품에 묶여 있으므로, Apple 이 돌려준 productId 가
 * 어떤 상품을 샀는지의 유일한 근거다.
 */
export function resolveByIosSku(sku: string): {
  productType: PaymentProductType;
  spec: ProductSpec;
} {
  for (const [type, spec] of Object.entries(PRODUCT_CATALOG)) {
    if (spec?.iosSku && spec.iosSku === sku) {
      return { productType: type as PaymentProductType, spec };
    }
  }
  throw new BadRequestException(`알 수 없는 App Store 상품입니다. (${sku})`);
}

/**
 * 클라이언트가 결제하려는 금액이 정가와 같은지 확인하고, 서버가 아는 사양을 돌려준다.
 * 금액이 다르면 PG 승인을 시도하기 전에 막는다.
 */
export function resolveProduct(
  productType: PaymentProductType,
  amount: number,
): ProductSpec {
  const spec = getProductSpec(productType);
  if (amount !== spec.price) {
    throw new BadRequestException(
      `결제 금액이 상품 가격과 일치하지 않습니다. (요청 ${amount}원 / 정가 ${spec.price}원)`,
    );
  }
  return spec;
}

/**
 * 충전 상품이 주는 보석 수.
 *
 * base 는 묶음 이름에 적힌 수, bonus 는 덤이다. 실제 적립은 base + bonus.
 * 가격과 마찬가지로 서버가 정한다.
 */
export const COIN_GRANTS: Partial<
  Record<PaymentProductType, { base: number; bonus: number }>
> = {
  COINS_10: { base: 10, bonus: 0 },
  COINS_20: { base: 20, bonus: 2 },
  COINS_30: { base: 30, bonus: 0 },
  COINS_50: { base: 50, bonus: 0 },
  COINS_100: { base: 100, bonus: 0 },
  COINS_200: { base: 200, bonus: 0 },
  COINS_300: { base: 300, bonus: 0 },
};

/** 충전 상품 타입 목록. 결제 조회 조건으로 쓴다 — 하드코딩하면 묶음이 늘 때 빠진다. */
export const COIN_PRODUCT_TYPES = Object.keys(
  COIN_GRANTS,
) as PaymentProductType[];

export function coinsFor(productType: PaymentProductType): number {
  const g = COIN_GRANTS[productType];
  return g ? g.base + g.bonus : 0;
}

/** 충전용으로 노출할 상품 목록. 보석함의 '보석 충전' 탭이 쓴다. */
export function listCoinPacks() {
  return (Object.keys(COIN_GRANTS) as PaymentProductType[]).map((type) => {
    const g = COIN_GRANTS[type];
    return {
      productType: type,
      base: g?.base ?? 0,
      bonus: g?.bonus ?? 0,
      coins: (g?.base ?? 0) + (g?.bonus ?? 0),
      name: PRODUCT_CATALOG[type]?.name ?? '',
      price: PRODUCT_CATALOG[type]?.price ?? 0,
    };
  });
}
