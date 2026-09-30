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
  ConfirmAppStoreDto,
  ListPaymentsQuery,
} from './dto';
import {
  resolveByIosSku,
  resolveByPlaySku,
  resolveProduct,
} from './product-catalog';
import { GooglePlayService } from './google-play.service';
import { AppStoreService } from './app-store.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private googlePlay: GooglePlayService,
    private appStore: AppStoreService,
  ) {}

  /**
   * iOS 인앱결제 승인. WebView 안의 웹이 StoreKit 브릿지로 구매한 뒤 호출한다.
   *
   * confirmGooglePlay 와 같은 구조다. 금액을 받지 않고, 어떤 상품을 샀는지는
   * Apple 이 돌려준 productId 가 정한다. 가격은 서버 가격표에서 가져온다.
   *
   * ⚠️ 여기서 소비(consume)에 해당하는 처리를 하지 않는다.
   * StoreKit 은 Transaction.finish() 를 **앱이** 불러야 거래가 끝나고, 그전까지는
   * 앱을 다시 켤 때마다 미완료 거래로 다시 내려온다. 이 응답을 받은 웹이 네이티브에
   * finish 를 요청하는 순서라, 서버 저장이 실패하면 거래가 살아남아 재시도된다.
   * (Play 는 반대로 서버가 consume 해야 해서 여기서 처리한다)
   */
  async confirmAppStore(
    userId: string,
    dto: ConfirmAppStoreDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const { transactionId, childId, productMeta } = dto;
    if (!transactionId) {
      throw new BadRequestException('필수 파라미터가 누락되었습니다.');
    }

    // 같은 트랜잭션으로 두 번 들어와도 결제가 중복 생성되지 않게 한다.
    // iOS 는 미완료 거래를 앱 실행마다 다시 내려주므로 재시도가 Play 보다 잦다.
    const existing = await this.prisma.payment.findFirst({
      where: { provider: 'APP_STORE', paymentKey: transactionId },
    });
    if (existing) return existing;

    const tx = await this.appStore.getTransaction(transactionId);

    // 클라이언트가 보낸 productType 은 쓰지 않는다. Apple 이 돌려준 productId 로 확정한다.
    const { productType, spec } = resolveByIosSku(tx.productId);

    // 가족 공유로 받은 항목은 결제가 아니다. 소모품에는 원래 적용되지 않지만,
    // 상품 구성이 바뀌어도 이 경로가 조용히 열리지 않도록 막아둔다.
    if (tx.inAppOwnershipType && tx.inAppOwnershipType !== 'PURCHASED') {
      throw new BadRequestException('구매하신 결제 정보가 아닙니다.');
    }

    return this.prisma.payment.create({
      data: {
        userId,
        childId: childId ?? null,
        // Apple 은 Play 의 orderId 같은 별도 주문번호를 주지 않는다.
        // 트랜잭션 ID 가 거래당 유일하므로 그대로 주문번호로 쓴다.
        orderId: `AS-${tx.transactionId}`,
        productType,
        productName: spec.name,
        productMeta: productMeta as Prisma.InputJsonValue | undefined,
        amount: spec.price,
        currency: 'KRW',
        provider: 'APP_STORE',
        status: PaymentStatus.PAID,
        paymentKey: tx.transactionId,
        transactionId: tx.originalTransactionId,
        method: 'APP_STORE',
        approvedAt: tx.purchaseDate ? new Date(tx.purchaseDate) : new Date(),
        rawResponse: tx as unknown as Prisma.InputJsonValue,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        events: {
          create: {
            type: 'CONFIRMED',
            status: PaymentStatus.PAID,
            amount: spec.price,
            payload: tx as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: { events: true },
    });
  }

  /**
   * App Store 환불 / 환불 취소를 결제와 콘텐츠에 반영한다.
   *
   * 웹훅 페이로드를 믿지 않고 transactionId 로 Apple 에 되물은 결과만 쓴다.
   * 위조 알림이 들어와도 Apple 이 revocationDate 를 주지 않으면 아무 일도 일어나지 않는다.
   * (confirmAppStore 가 영수증 대신 트랜잭션 ID 로 되묻는 것과 같은 구조다)
   *
   * ⚠️ 열람 차단은 새 플래그가 아니라 TemperamentResult.isPaid 를 false 로
   * 되돌려서 한다. 결과를 읽는 쪽(getResult / getHistory / buildPreview)이 이미
   * 전부 isPaid 로 분기하고 있어서, 플래그를 하나 더 만들고 읽는 곳을 일일이
   * 고치는 방식보다 빠뜨릴 구멍이 없다. refundedAt 은 "환불됨"과 "애초에 결제
   * 안 함"을 화면에서 구분하기 위해서만 쓴다.
   */
  async applyAppStoreRevocation(transactionId: string) {
    const tx = await this.appStore.lookupTransaction(transactionId);
    if (!tx) {
      this.logger.warn(`환불 알림: Apple 에 없는 트랜잭션 tx=${transactionId}`);
      return { handled: false, reason: 'unknown-transaction' as const };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { provider: 'APP_STORE', paymentKey: transactionId },
    });
    if (!payment) {
      // 결제 저장이 실패한 채로 환불된 경우. 잠글 콘텐츠가 없으니 기록만 남긴다.
      this.logger.warn(`환불 알림: DB 에 없는 결제 tx=${transactionId}`);
      return { handled: false, reason: 'unknown-payment' as const };
    }

    const revoked = Boolean(tx.revocationDate);
    const nextStatus = revoked ? PaymentStatus.REFUNDED : PaymentStatus.PAID;

    // 같은 알림이 재시도로 여러 번 들어와도 이벤트가 쌓이지 않게 한다.
    if (payment.status === nextStatus) {
      return { handled: true, status: nextStatus, changed: false };
    }

    const revokedAt = tx.revocationDate ? new Date(tx.revocationDate) : null;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          refundedAt: revokedAt,
          events: {
            create: {
              type: revoked ? 'REFUNDED' : 'REFUND_REVERSED',
              status: nextStatus,
              amount: payment.amount,
              reason: revoked
                ? `App Store 환불 (reason=${tx.revocationReason ?? '-'})`
                : 'App Store 환불 취소',
              payload: tx as unknown as Prisma.InputJsonValue,
            },
          },
        },
      }),
      // 이 결제로 열린 상세 리포트를 잠근다(환불 취소면 되돌린다).
      this.prisma.temperamentResult.updateMany({
        where: { paymentId: payment.id },
        data: revoked
          ? { isPaid: false, refundedAt: revokedAt ?? new Date() }
          : { isPaid: true, refundedAt: null },
      }),
    ]);

    this.logger.log(
      `App Store ${revoked ? '환불' : '환불 취소'} 반영 ` +
        `tx=${transactionId} order=${payment.orderId}`,
    );
    return { handled: true, status: nextStatus, changed: true };
  }

  /**
   * 환불 심사용 소비 정보를 Apple 에 보낸다(CONSUMPTION_REQUEST 응답).
   *
   * Apple 은 12시간 안에 받은 응답만 심사에 반영한다. 실패해도 서비스 동작에는
   * 영향이 없으므로 예외를 밖으로 던지지 않는다 — 웹훅은 200 으로 닫혀야 한다.
   *
   * ⚠️ customerConsented 를 사용자의 '제3자 제공 동의'로 본다.
   *    Apple 은 사용자가 소비 정보 제공에 동의했을 때만 이 데이터를 쓴다.
   *    동의가 없으면 false 로 보내고, Apple 은 그 데이터를 무시한다.
   *    개인정보처리방침에 "환불 심사를 위해 구매·이용 정보를 App Store 에 제공"이
   *    명시돼 있어야 이 매핑이 성립한다.
   */
  async respondToConsumptionRequest(transactionId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { provider: 'APP_STORE', paymentKey: transactionId },
      include: { user: true },
    });
    if (!payment?.user) {
      this.logger.warn(`소비 정보 요청: DB 에 없는 결제 tx=${transactionId}`);
      return { handled: false as const };
    }

    // 이 결제로 열린 리포트가 남아 있는지 = 콘텐츠를 실제로 전달했는지.
    const delivered = await this.prisma.temperamentResult.count({
      where: { paymentId: payment.id },
    });

    // 누적 구매·환불액(원). 구간 계산에만 쓰므로 환율은 대략값으로 충분하다.
    const [purchased, refunded] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { userId: payment.userId, status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { userId: payment.userId, status: PaymentStatus.REFUNDED },
        _sum: { amount: true },
      }),
    ]);

    const ok = await this.appStore.sendConsumptionInfo(transactionId, {
      customerConsented: Boolean(payment.user.thirdPartyAgreedAt),
      // 리포트는 구매 즉시 전부 공개된다. 남아 있으면 '전부 사용'으로 본다.
      consumptionStatus: delivered > 0 ? 3 : 1,
      deliveryStatus: 0,
      platform: 2,
      // 구매 전에도 무료 결과(성향 요약·강점)를 볼 수 있다.
      sampleContentProvided: true,
      // 콘텐츠를 정상 전달했으면 환불 거절을 권한다. 아니면 의견을 내지 않는다.
      refundPreference: delivered > 0 ? 2 : 3,
      accountTenure: accountTenureBucket(payment.user.createdAt),
      // 열람 시간을 측정하지 않는다. 추측해서 보내느니 미신고가 낫다.
      playTime: 0,
      lifetimeDollarsPurchased: dollarBucket(purchased._sum.amount ?? 0),
      lifetimeDollarsRefunded: dollarBucket(refunded._sum.amount ?? 0),
      userStatus: 1,
    });

    return { handled: ok };
  }

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

    // 이 메서드는 Toss 취소 API 만 호출한다.
    // 인앱결제의 paymentKey 는 스토어 트랜잭션 ID 라서 Toss 가 모르는 값이고,
    // Apple 은 애초에 판매자에게 환불 API 를 주지 않는다(Google 은 Play Console).
    // 막지 않으면 Toss 에 엉뚱한 취소 요청이 나가고, 실패 사유도 드러나지 않는다.
    if (payment.provider !== 'TOSS') {
      throw new ConflictException(
        payment.provider === 'APP_STORE'
          ? 'App Store 결제는 Apple 만 환불할 수 있습니다. 고객이 reportaproblem.apple.com 에서 신청해야 합니다.'
          : 'Google Play 결제는 Play Console 에서 환불해야 합니다.',
      );
    }

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

/** 가입 후 경과일을 Apple 의 accountTenure 구간으로 바꾼다. */
function accountTenureBucket(createdAt: Date): number {
  const days = (Date.now() - createdAt.getTime()) / 86_400_000;
  if (days < 3) return 1;
  if (days < 10) return 2;
  if (days < 30) return 3;
  if (days < 90) return 4;
  if (days < 180) return 5;
  if (days < 365) return 6;
  return 7;
}

/** 원화 누적액을 Apple 의 달러 구간으로 바꾼다(환율은 구간 판정용 근사값). */
function dollarBucket(amountKrw: number): number {
  const usd = amountKrw / 1350;
  if (usd <= 0) return 1;
  if (usd < 50) return 2;
  if (usd < 100) return 3;
  if (usd < 500) return 4;
  if (usd < 1000) return 5;
  if (usd < 2000) return 6;
  return 7;
}
