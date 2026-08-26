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
}

/**
 * 판매 중인 상품 목록.
 *
 * 여기에 없는 상품 타입은 결제 자체가 거부된다.
 * (OTHER 처럼 금액을 자유롭게 넣을 수 있는 통로를 남기면 검증이 무의미해진다.)
 */
export const PRODUCT_CATALOG: Partial<Record<PaymentProductType, ProductSpec>> =
  {
    TEMPERAMENT_REPORT: {
      name: '기질 검사 상세 리포트',
      price: 990,
      playSku: 'temperament_report',
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
