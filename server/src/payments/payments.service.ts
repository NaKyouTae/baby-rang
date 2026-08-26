import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelPaymentDto,
  ConfirmAndCreateDto,
  ConfirmPaymentDto,
  CreatePaymentDto,
  FailPaymentDto,
  ConfirmGooglePlayDto,
  ListPaymentsQuery,
} from './dto';
import { resolveByPlaySku, resolveProduct } from './product-catalog';
import { GooglePlayService } from './google-play.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private googlePlay: GooglePlayService,
  ) {}

  /**
   * Google Play 결제 승인. Android(TWA)에서 Digital Goods API 로 구매한 뒤 호출된다.
   *
   * Toss 경로(confirmAndCreate)와 달리 금액을 아예 받지 않는다. 어떤 상품을 샀는지는
   * 구매 토큰이 묶여 있는 Play 제품 ID가 결정하고, 가격은 서버 가격표에서 가져온다.
   */
  async confirmGooglePlay(
    userId: string,
    dto: ConfirmGooglePlayDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const { productId, purchaseToken, childId, productMeta } = dto;
    if (!productId || !purchaseToken) {
      throw new BadRequestException('필수 파라미터가 누락되었습니다.');
    }

    // 클라이언트가 보낸 productType 은 쓰지 않는다. Play 제품 ID로 서버가 확정한다.
    const { productType, spec } = resolveByPlaySku(productId);

    // 같은 구매 토큰으로 두 번 들어와도 결제가 중복 생성되지 않게 한다.
    // (네트워크 재시도, 사용자의 새로고침 등으로 흔히 발생한다)
    const existing = await this.prisma.payment.findFirst({
      where: { provider: 'GOOGLE_PLAY', paymentKey: purchaseToken },
    });
    if (existing) return existing;

    const purchase = await this.googlePlay.getPurchase(
      productId,
      purchaseToken,
    );

    // 0=구매완료. 1(취소)·2(대기중)는 콘텐츠를 열어주면 안 된다.
    if (purchase.purchaseState !== 0) {
      throw new BadRequestException(
        purchase.purchaseState === 2
          ? '결제가 아직 완료되지 않았습니다. 잠시 후 다시 확인해 주세요.'
          : '취소된 결제입니다.',
      );
    }

    const orderId = purchase.orderId ?? `GP-${purchaseToken.slice(0, 40)}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        childId: childId ?? null,
        orderId,
        productType,
        productName: spec.name,
        productMeta: productMeta as Prisma.InputJsonValue | undefined,
        amount: spec.price,
        currency: 'KRW',
        provider: 'GOOGLE_PLAY',
        status: PaymentStatus.PAID,
        paymentKey: purchaseToken,
        method: 'GOOGLE_PLAY',
        approvedAt: purchase.purchaseTimeMillis
          ? new Date(Number(purchase.purchaseTimeMillis))
          : new Date(),
        rawResponse: purchase as unknown as Prisma.InputJsonValue,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        events: {
          create: {
            type: 'CONFIRMED',
            status: PaymentStatus.PAID,
            amount: spec.price,
            payload: purchase as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: { events: true },
    });

    // Payment 를 먼저 만든 뒤 소비한다. 소비가 실패해도 사용자는 이미 돈을 냈으므로
    // 콘텐츠는 열어줘야 하고, 소비 실패는 GooglePlayService 가 에러 로그로 남긴다.
    // (3일 내 미소비 시 자동 환불되므로 로그 모니터링이 필요하다)
    await this.googlePlay.consume(productId, purchaseToken);

    return payment;
  }

  /**
   * 시크릿 키 자체는 절대 로그에 남기지 않는다. live/test 구분만 남긴다.
   * 클라이언트 키와 시크릿 키의 상점이 다르면 승인이 통째로 실패하므로,
   * 이 값과 프론트에 찍히는 clientKey 의 환경이 일치하는지가 1차 점검 포인트다.
   */
  private describeSecretKey() {
    const key = process.env.TOSS_SECRET_KEY;
    if (!key) return 'MISSING';
    return key.startsWith('live_')
      ? 'LIVE'
      : key.startsWith('test_')
        ? 'TEST'
        : 'UNKNOWN';
  }

  /**
   * paymentKey 로 결제 건을 조회해 실제 상점 아이디(mId)를 읽는다.
   * 승인이 실패해도 결제 건 자체는 조회되므로, "어느 상점으로 결제창이 떴는지"를
   * 서버에서 확정할 수 있는 유일한 경로다.
   * 시크릿 키가 다른 상점 것이면 여기서 404 가 나는데, 그 자체가 진단 정보다.
   */
  private async lookupMerchantId(paymentKey: string) {
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) return null;
    try {
      const auth = Buffer.from(`${secretKey}:`).toString('base64');
      const res = await fetch(
        `https://api.tosspayments.com/v1/payments/${paymentKey}`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      const json: any = await res.json();
      return {
        ok: res.ok,
        mId: json?.mId ?? null,
        status: json?.status ?? null,
        code: json?.code ?? null,
      };
    } catch (e) {
      this.logger.warn(`mId 조회 실패: ${String(e)}`);
      return null;
    }
  }

  async create(
    userId: string,
    dto: CreatePaymentDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    if (!dto.orderId || !dto.amount || dto.amount <= 0) {
      throw new BadRequestException('orderId/amount가 올바르지 않습니다.');
    }

    // 금액·상품명은 클라이언트를 믿지 않고 서버 가격표로 확정한다.
    const spec = resolveProduct(dto.productType, dto.amount);

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
        productName: spec.name,
        productMeta: dto.productMeta as Prisma.InputJsonValue | undefined,
        amount: spec.price,
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
            amount: spec.price,
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
      throw new ConflictException(
        `현재 상태(${payment.status})에서 승인할 수 없습니다.`,
      );
    }
    if (payment.amount !== amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException(
        'TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    const tossRes = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': orderId,
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      },
    );
    const tossJson: any = await tossRes.json();

    if (!tossRes.ok) {
      const lookup = await this.lookupMerchantId(paymentKey);
      this.logger.error(
        `[toss/confirm] 실패 orderId=${orderId} httpStatus=${tossRes.status} ` +
          `code=${tossJson?.code ?? 'null'} message=${tossJson?.message ?? 'null'} ` +
          `secretKeyEnv=${this.describeSecretKey()} lookup=${JSON.stringify(lookup)}`,
      );
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

  /**
   * PG 결제 완료 후 승인 + Payment 생성을 한 번에 처리.
   * PENDING 상태 없이 바로 PAID로 생성된다.
   */
  async confirmAndCreate(
    userId: string,
    dto: ConfirmAndCreateDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    // productName 은 클라이언트 값을 쓰지 않는다. 아래 spec.name 으로 확정한다.
    const {
      paymentKey,
      providerId,
      amount,
      productType,
      childId,
      productMeta,
    } = dto;

    if (!paymentKey || !providerId || !amount || amount <= 0) {
      throw new BadRequestException('필수 파라미터가 누락되었습니다.');
    }

    // 금액·상품명은 클라이언트를 믿지 않고 서버 가격표로 확정한다.
    // 정가와 다른 금액이면 PG 승인을 시도하기 전에 여기서 막는다.
    // (승인되지 않은 결제는 PG에서 자동으로 취소된다.)
    const spec = resolveProduct(productType, amount);

    // 중복 방지: 같은 providerId로 이미 생성된 Payment가 있는지 확인
    const existing = await this.prisma.payment.findUnique({
      where: { orderId: providerId },
    });
    if (existing) {
      if (existing.status === PaymentStatus.PAID) return existing;
      throw new ConflictException('이미 처리된 결제입니다.');
    }

    // 토스 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException(
        'TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    this.logger.log(
      `[toss/confirm] 요청 providerId=${providerId} amount=${spec.price} secretKeyEnv=${this.describeSecretKey()}`,
    );

    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    const tossRes = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': providerId,
        },
        // 승인 요청도 서버가 확정한 정가로 보낸다.
        body: JSON.stringify({
          paymentKey,
          orderId: providerId,
          amount: spec.price,
        }),
      },
    );

    const tossJson: any = await tossRes.json();

    if (!tossRes.ok) {
      // 실패 원인 규명에 필요한 건 message 가 아니라 code + mId 다.
      // message("업체 사정으로 결제를 일시 중지하였습니다")는 상점 상태 문제와
      // 카드사 거절을 같은 문구로 뭉뚱그리기 때문에 그것만으로는 판별이 안 된다.
      const lookup = await this.lookupMerchantId(paymentKey);
      this.logger.error(
        `[toss/confirm] 실패 providerId=${providerId} httpStatus=${tossRes.status} ` +
          `code=${tossJson?.code ?? 'null'} message=${tossJson?.message ?? 'null'} ` +
          `secretKeyEnv=${this.describeSecretKey()} lookup=${JSON.stringify(lookup)}`,
      );
      throw new BadRequestException(
        tossJson?.code
          ? `[${tossJson.code}] ${tossJson?.message ?? 'Toss 승인 실패'}`
          : (tossJson?.message ?? 'Toss 승인 실패'),
      );
    }

    // 승인 성공 시 어느 상점으로 정산되는지 로그에 남긴다.
    this.logger.log(
      `[toss/confirm] 승인 providerId=${providerId} mId=${tossJson?.mId ?? 'null'} method=${tossJson?.method ?? 'null'}`,
    );

    // 승인 성공 → Payment를 PAID 상태로 바로 생성
    return this.prisma.payment.create({
      data: {
        userId,
        childId: childId ?? null,
        orderId: providerId,
        productType,
        productName: spec.name,
        productMeta: productMeta as Prisma.InputJsonValue | undefined,
        amount: spec.price,
        currency: 'KRW',
        provider: 'TOSS',
        status: PaymentStatus.PAID,
        paymentKey,
        transactionId: tossJson?.lastTransactionKey,
        method: tossJson?.method,
        receiptUrl: tossJson?.receipt?.url,
        cardCompany: tossJson?.card?.issuerCode ?? tossJson?.card?.company,
        cardNumberMask: tossJson?.card?.number,
        cardInstallment: tossJson?.card?.installmentPlanMonths,
        approvedAt: tossJson?.approvedAt
          ? new Date(tossJson.approvedAt)
          : new Date(),
        rawResponse: tossJson as Prisma.InputJsonValue,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        events: {
          create: {
            type: 'CONFIRMED',
            status: PaymentStatus.PAID,
            amount: spec.price,
            payload: tossJson as Prisma.InputJsonValue,
          },
        },
      },
      include: { events: true },
    });
  }

  async confirm(userId: string, orderId: string, dto: ConfirmPaymentDto) {
    const payment = await this.findOwned(userId, orderId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(
        `현재 상태(${payment.status})에서 승인할 수 없습니다.`,
      );
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
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
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
      throw new BadRequestException(
        'Toss paymentKey가 없어 환불할 수 없습니다.',
      );
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
      throw new BadRequestException(
        'TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.',
      );
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
      throw new ConflictException(
        `현재 상태(${payment.status})에서 취소할 수 없습니다.`,
      );
    }

    const cancelAmount = dto.amount ?? payment.amount;
    const isFull = cancelAmount >= payment.amount;
    const nextStatus = isFull
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIAL_REFUNDED;

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
        // 목록에선 불필요한 대용량 JSON(건당 수~수십KB) 제외
        omit: { rawRequest: true, rawResponse: true, metadata: true },
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
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }
    return payment;
  }

  /** 웹훅용: orderId로 조회 (없으면 null) */
  async findByOrderIdOrNull(orderId: string) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }
}
