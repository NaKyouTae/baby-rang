import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CrawlerVisitsService } from './crawler-visits.service';

@Controller('crawler-visits')
export class CrawlerVisitsController {
  constructor(private crawlerVisits: CrawlerVisitsService) {}

  /**
   * 앱(Next.js) 미들웨어가 AI 크롤러 요청을 감지하면 던지는 집계용 엔드포인트.
   *
   * 인증을 두지 않는다. 적을 수 있는 것은 "알려진 크롤러 이름 + 경로"뿐이고
   * 서비스 동작에 영향을 주지 않는 통계 테이블이라, 토큰을 하나 더 늘리는 비용이
   * 이득보다 크다고 봤다. 대신 UA 판별을 서버가 쥐고 있어 아무 값이나 쌓이지는 않는다.
   */
  @Post()
  @HttpCode(204)
  async record(@Body() body: { userAgent?: string; path?: string }) {
    await this.crawlerVisits.record(body.userAgent, body.path ?? '/');
  }
}
