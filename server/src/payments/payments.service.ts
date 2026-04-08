import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelPaymentDto,
  ConfirmPaymentDto,
  CreatePaymentDto,
  FailPaymentDto,
  ListPaymentsQuery,
} from './dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreatePaymentDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    if (!dto.orderId || !dto.amount || dto.amount <= 0) {
      throw new BadRequestException('orderId/amount가 올바르지 않습니다.');
    }

    const exists = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });
    if (exists) throw new ConflictException('이미 존재하는 주문입니다.');

    return this.prisma.payment.create({
      data: {
        userId,
        childId: dto.childId,
        orderId: dto.orderId,
        productType: dto.productType,
        productName: dto.productName,
        productMeta: dto.productMeta as Prisma.InputJsonValue | undefined,
        amount: dto.amount,
        taxFreeAmount: dto.taxFreeAmount ?? 0,
        vatAmount: dto.vatAmount ?? 0,
        discountAmount: dto.discountAmount ?? 0,
        currency: dto.currency ?? 'KRW',
        provider: dto.provider,
        method: dto.method,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        buyerTel: dto.buyerTel,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        rawRequest: dto.rawRequest as Prisma.InputJsonValue | undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        status: PaymentStatus.PENDING,
        events: {
          create: {
            type: 'CREATED',
            status: PaymentStatus.PENDING,
            amount: dto.amount,
            payload: dto.rawRequest as Prisma.InputJsonValue | undefined,
          },
        },
      },
      include: { events: true },
    });
  }

  async confirmToss(
    userId: string,
    orderId: string,
    paymentKey: string,
    amount: number,
  ) {
    const payment = await this.findOwned(userId, orderId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`현재 상태(${payment.status})에서 승인할 수 없습니다.`);
    }
    if (payment.amount !== amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    }

    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': orderId,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const tossJson: any = await tossRes.json();

    if (!tossRes.ok) {
      await this.fail(userId, orderId, {
        failureCode: tossJson?.code ?? 'TOSS_CONFIRM_FAILED',
        failureMessage: tossJson?.message ?? 'Toss 승인 실패',
        rawResponse: tossJson,
      });
      throw new BadRequestException(tossJson?.message ?? 'Toss 승인 실패');
    }

    return this.confirm(userId, orderId, {
      paymentKey,
      transactionId: tossJson?.lastTransactionKey,
      method: tossJson?.method,
      receiptUrl: tossJson?.receipt?.url,
      cardCompany: tossJson?.card?.issuerCode ?? tossJson?.card?.company,
      cardNumberMask: tossJson?.card?.number,
      cardInstallment: tossJson?.card?.installmentPlanMonths,
      approvedAt: tossJson?.approvedAt,
      rawResponse: tossJson,
    });
  }

  async confirm(userId: string, orderId: string, dto: ConfirmPaymentDto) {
    const payment = await this.findOwned(userId, orderId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`현재 상태(${payment.status})에서 승인할 수 없습니다.`);
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paymentKey: dto.paymentKey,
        transactionId: dto.transactionId,
        method: dto.method ?? payment.method,
        receiptUrl: dto.receiptUrl,
        cardCompany: dto.cardCompany,
        cardNumberMask: dto.cardNumberMask,
        cardInstallment: dto.cardInstallment,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : new Date(),
        rawResponse: dto.rawResponse as Prisma.InputJsonValue | undefined,
        events: {
          create: {
            type: 'CONFIRMED',
            status: PaymentStatus.PAID,
            amount: payment.amount,
            payload: dto.rawResponse as Prisma.InputJsonValue | undefined,
          },
        },
      },
      include: { events: true },
    });
  }

  async fail(userId: string, orderId: string, dto: FailPaymentDto) {
    const payment = await this.findOwned(userId, orderId);
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureCode: dto.failureCode,
        failureMessage: dto.failureMessage,
        rawResponse: dto.rawResponse as Prisma.InputJsonValue | undefined,
        events: {
          create: {
            type: 'FAILED',
            status: PaymentStatus.FAILED,
            reason: `${dto.failureCode}: ${dto.failureMessage}`,
            payload: dto.rawResponse as Prisma.InputJsonValue | undefined,
          },
        },
      },
      include: { events: true },
    });
  }

  /**
   * 관리자 환불: Toss 취소 API 호출 후 DB 상태 갱신.
   * userId 소유권 검증을 하지 않는다 (admin 용).
   */
  async refundTossByAdmin(
    orderId: string,
    dto: { reason: string; amount?: number },
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('결제 내역을 찾을 수 없습니다.');

    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIAL_REFUNDED
    ) {
      throw new ConflictException(
        `현재 상태(${payment.status})에서 환불할 수 없습니다.`,
      );
    }
    if (!payment.paymentKey) {
      throw new BadRequestException('Toss paymentKey가 없어 환불할 수 없습니다.');
    }
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('환불 사유가 필요합니다.');
    }

    const cancelAmount = dto.amount ?? payment.amount;
    if (cancelAmount <= 0 || cancelAmount > payment.amount) {
      throw new BadRequestException('환불 금액이 올바르지 않습니다.');
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    }

    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    const isFull = cancelAmount >= payment.amount;
    const body: Record<string, unknown> = { cancelReason: dto.reason };
    if (!isFull) body.cancelAmount = cancelAmount;

    const tossRes = await fetch(
      `https://api.tosspayments.com/v1/payments/${payment.paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `refund-${orderId}-${Date.now()}`,
        },
        body: JSON.stringify(body),
      },
    );
    const tossJson: any = await tossRes.json();

    if (!tossRes.ok) {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: 'REFUND_FAILED',
          status: payment.status,
          amount: cancelAmount,
          reason: `${tossJson?.code ?? 'TOSS_CANCEL_FAILED'}: ${tossJson?.message ?? ''}`,
          payload: tossJson as Prisma.InputJsonValue,
        },
      });
      throw new BadRequestException(
        tossJson?.message ?? 'Toss 환불 요청이 실패했습니다.',
      );
    }

    const nextStatus = isFull
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIAL_REFUNDED;

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        cancelledAt: isFull ? new Date() : payment.cancelledAt,
        refundedAt: new Date(),
        rawResponse: tossJson as Prisma.InputJsonValue,
        events: {
          create: {
            type: isFull ? 'CANCELLED' : 'PARTIAL_REFUNDED',
            status: nextStatus,
            amount: cancelAmount,
            reason: dto.reason,
            payload: tossJson as Prisma.InputJsonValue,
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async cancel(userId: string, orderId: string, dto: CancelPaymentDto) {
    const payment = await this.findOwned(userId, orderId);
    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIAL_REFUNDED
    ) {
      throw new ConflictException(`현재 상태(${payment.status})에서 취소할 수 없습니다.`);
    }

    const cancelAmount = dto.amount ?? payment.amount;
    const isFull = cancelAmount >= payment.amount;
    const nextStatus = isFull ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUNDED;

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        cancelledAt: isFull ? new Date() : payment.cancelledAt,
        refundedAt: new Date(),
        rawResponse: dto.rawResponse as Prisma.InputJsonValue | undefined,
        events: {
          create: {
            type: isFull ? 'CANCELLED' : 'PARTIAL_REFUNDED',
            status: nextStatus,
            amount: cancelAmount,
            reason: dto.reason,
            payload: dto.rawResponse as Prisma.InputJsonValue | undefined,
          },
        },
      },
      include: { events: true },
    });
  }

  async list(userId: string, query: ListPaymentsQuery) {
    const take = Math.min(Number(query.take) || 20, 100);
    const skip = Number(query.skip) || 0;
    const where: Prisma.PaymentWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.productType ? { productType: query.productType } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { events: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, take, skip };
  }

  async findOne(userId: string, orderId: string) {
    const payment = await this.findOwned(userId, orderId);
    return this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private async findOwned(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }
    return payment;
  }
}
