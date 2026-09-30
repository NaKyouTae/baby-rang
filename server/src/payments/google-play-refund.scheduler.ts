import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

/**
 * Google Play 환불을 주기적으로 훑어 반영한다.
 *
 * App Store 는 환불이 생기면 서버로 알림을 밀어주지만(webhooks/app-store),
 * Play 에는 그런 경로가 없다. RTDN 이 있긴 하나 GCP Pub/Sub 토픽과 푸시 구독을
 * 따로 세팅해야 해서, 지금 규모에서는 폴링이 훨씬 단순하다.
 *
 * 스케줄러 라이브러리를 쓰지 않는 이유: 주기 작업이 이것 하나뿐이라
 * setInterval 로 충분하다. (이 프로젝트가 googleapis 대신 fetch 를 쓰는 것과 같은 결)
 */
@Injectable()
export class GooglePlayRefundScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(GooglePlayRefundScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  /** 이전 실행이 끝나기 전에 다음 주기가 오면 건너뛴다. */
  private running = false;

  constructor(private payments: PaymentsService) {}

  /** 폴링 주기(ms). 기본 6시간. */
  private get intervalMs(): number {
    const hours = Number(process.env.PLAY_REFUND_POLL_HOURS ?? 6);
    return (Number.isFinite(hours) && hours > 0 ? hours : 6) * 60 * 60 * 1000;
  }

  onModuleInit() {
    // 서비스 계정이 없으면 조회 자체가 불가능하다. 매 주기 실패 로그만 쌓인다.
    if (!process.env.PLAY_SERVICE_ACCOUNT_JSON) {
      this.logger.warn(
        'PLAY_SERVICE_ACCOUNT_JSON 이 없어 Play 환불 동기화를 시작하지 않는다.',
      );
      return;
    }

    // 기동 직후는 다른 초기화와 겹치지 않게 조금 미룬다.
    setTimeout(() => void this.run(), 30_000);
    this.timer = setInterval(() => void this.run(), this.intervalMs);
    this.logger.log(
      `Play 환불 동기화 시작 (주기 ${this.intervalMs / 3_600_000}시간)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) {
      this.logger.warn('이전 동기화가 끝나지 않아 이번 주기를 건너뛴다.');
      return;
    }
    this.running = true;
    try {
      // ⚠️ startTime 을 주지 않고 Play 보관 기간(기본 30일) 전체를 매번 훑는다.
      //
      // '마지막 실행 시각 이후'만 조회하면 배포·재시작으로 그 값이 사라졌을 때
      // 그 사이 환불을 영영 놓친다. 이미 REFUNDED 인 결제는 건너뛰므로
      // 전체를 훑어도 부작용이 없고, 거래량을 감안하면 비용도 무시할 수 있다.
      const result = await this.payments.syncGooglePlayRefunds();
      if (result.applied > 0) {
        this.logger.log(
          `Play 환불 동기화: ${result.checked}건 확인, ${result.applied}건 반영`,
        );
      }
    } catch (error) {
      // 다음 주기에 다시 시도한다. 여기서 죽으면 이후 주기가 전부 멈춘다.
      this.logger.error('Play 환불 동기화 실패', error as Error);
    } finally {
      this.running = false;
    }
  }
}
