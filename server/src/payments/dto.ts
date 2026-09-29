import { PaymentProductType, PaymentStatus } from '@prisma/client';

export interface CreatePaymentDto {
  childId?: string;
  orderId: string;
  productType: PaymentProductType;
  productName: string;
  productMeta?: Record<string, unknown>;
  amount: number;
  taxFreeAmount?: number;
  vatAmount?: number;
  discountAmount?: number;
  currency?: string;
  provider: string;
  method?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerTel?: string;
  metadata?: Record<string, unknown>;
  rawRequest?: Record<string, unknown>;
}

export interface ConfirmPaymentDto {
  paymentKey: string;
  transactionId?: string;
  method?: string;
  receiptUrl?: string;
  cardCompany?: string;
  cardNumberMask?: string;
  cardInstallment?: number;
  approvedAt?: string;
  rawResponse?: Record<string, unknown>;
}

export interface FailPaymentDto {
  failureCode: string;
  failureMessage: string;
  rawResponse?: Record<string, unknown>;
}

export interface CancelPaymentDto {
  reason: string;
  amount?: number;
  rawResponse?: Record<string, unknown>;
}

export interface ConfirmAndCreateDto {
  paymentKey: string;
  providerId: string;
  amount: number;
  productType: PaymentProductType;
  productName: string;
  childId?: string;
  productMeta?: Record<string, unknown>;
}

export interface ConfirmGooglePlayDto {
  /** Play Console 에 등록한 제품 ID. 현재는 temperament_report 하나뿐. */
  productId: string;
  /** Digital Goods API/PaymentRequest 가 돌려준 구매 토큰. */
  purchaseToken: string;
  productType: PaymentProductType;
  childId?: string;
  productMeta?: Record<string, unknown>;
}

export interface ConfirmAppStoreDto {
  /**
   * StoreKit 이 돌려준 트랜잭션 ID.
   * 영수증(JWS)이 아니라 ID 만 받는다 — 진위는 서버가 Apple 에 되물어 확인한다.
   */
  transactionId: string;
  productType: PaymentProductType;
  childId?: string;
  productMeta?: Record<string, unknown>;
}

export interface ListPaymentsQuery {
  status?: PaymentStatus;
  productType?: PaymentProductType;
  take?: string;
  skip?: string;
}
