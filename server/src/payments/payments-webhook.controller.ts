import { Body, Controller, Post, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';

/**
 * 토스 웹훅 수신 엔드포인트.
 * JWT 인증 없이 토스 서버에서 직접 호출한다.
 * 클라이언트 콜백이 실패했을 때의 안전망 역할.
 */
@Controller('webhooks/toss')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private payments: PaymentsService) {}

  @Post()
  async handleWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log(`Toss webhook received: ${JSON.stringify(body)}`);

    const eventType = body.eventType as string | undefined;

    // 결제 승인 완료 웹훅
    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      const data = body.data as Record<string, unknown> | undefined;
      if (!data) return { ok: true };

      const status = data.status as string;
      const orderId = data.orderId as string;
      const paymentKey = data.paymentKey as string;

      if (status === 'DONE' && orderId && paymentKey) {
        // 이미 처리되었는지 확인
        const existing = await this.payments.findByOrderIdOrNull(orderId);
        if (existing) {
          this.logger.log(
            `Webhook: Payment ${orderId} already exists (status: ${existing.status})`,
          );
          return { ok: true };
        }

        // 웹훅으로는 userId를 알 수 없으므로 로그만 남김.
        // 토스 대시보드에서 수동 확인 필요.
        this.logger.warn(
          `Webhook: Payment ${orderId} not found in DB but DONE on Toss. ` +
            `paymentKey: ${paymentKey}. Manual reconciliation may be needed.`,
        );
      }
    }

    return { ok: true };
  }
}
