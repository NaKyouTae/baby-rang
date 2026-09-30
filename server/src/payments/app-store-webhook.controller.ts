import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { AppStoreService } from './app-store.service';
import { PaymentsService } from './payments.service';

/**
 * App Store Server Notifications V2 수신 엔드포인트.
 *
 * App Store Connect > 앱 > 일반 정보 > App Store 서버 알림 에 이 URL 을 등록한다.
 * 프로덕션/샌드박스 URL 칸이 따로 있지만 같은 주소를 넣어도 된다 —
 * lookupTransaction 이 두 환경을 모두 조회하기 때문이다.
 *
 * 토스 웹훅과 마찬가지로 JWT 인증 없이 Apple 이 직접 호출한다.
 * 서명(x5c 체인)을 검증하는 대신 transactionId 로 Apple 에 되묻는다 —
 * app-store.service.ts 의 decodeNotification 주석 참고.
 */
@Controller('webhooks/app-store')
export class AppStoreWebhookController {
  private readonly logger = new Logger(AppStoreWebhookController.name);

  constructor(
    private appStore: AppStoreService,
    private payments: PaymentsService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: { signedPayload?: string }) {
    if (!body?.signedPayload) {
      // 형식이 아예 아니면 재시도해도 결과가 같다. 200 으로 닫는다.
      this.logger.warn('signedPayload 가 없는 요청');
      return { ok: true };
    }

    const noti = this.appStore.decodeNotification(body.signedPayload);
    const txId = this.appStore.transactionIdOf(noti);

    this.logger.log(
      `App Store 알림 ${noti.notificationType}` +
        `${noti.subtype ? `/${noti.subtype}` : ''} ` +
        `uuid=${noti.notificationUUID} tx=${txId ?? '-'}`,
    );

    switch (noti.notificationType) {
      // 환불 승인 / 환불 번복. 둘 다 Apple 에 되물어 현재 상태로 맞춘다.
      case 'REFUND':
      case 'REFUND_REVERSED': {
        if (!txId) return { ok: true };
        // ⚠️ 여기서 던지는 예외를 잡지 않는다.
        // 2xx 가 아니면 Apple 이 재시도하는데(최대 5회 / 3일), 조회 실패 같은
        // 일시적 오류는 재시도가 맞는 처리다. 200 으로 삼켜버리면 그 환불은 영영 유실된다.
        await this.payments.applyAppStoreRevocation(txId);
        return { ok: true };
      }

      // 소모품 환불 심사 중 Apple 이 소비 정보를 요청한 것.
      // 응답(PUT /inApps/v1/transactions/consumption/{id})하면 심사에 반영되지만
      // 사용자 동의(customerConsented)가 전제라 지금은 기록만 남긴다.
      case 'CONSUMPTION_REQUEST':
        this.logger.warn(`소비 정보 요청 수신 tx=${txId ?? '-'} — 미응답`);
        return { ok: true };

      // App Store Connect 의 "테스트 알림 요청" 버튼이 보내는 것.
      case 'TEST':
        return { ok: true };

      // REFUND_DECLINED 를 포함해 나머지는 위에서 로그만 남기고 넘어간다.
      default:
        return { ok: true };
    }
  }
}
