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

export interface ListPaymentsQuery {
  status?: PaymentStatus;
  productType?: PaymentProductType;
  take?: string;
  skip?: string;
}
