import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdmobSsvVerifier } from './admob-ssv-verifier';
import { AdRewardsService } from './ad-rewards.service';

/**
 * AdMob 보상형 광고 서버 측 확인(SSV) 콜백.
 *
 * AdMob 콘솔의 광고 단위 설정 > 서버 측 확인에 이 주소를 넣는다.
 * JWT 없이 Google 이 GET 으로 부르므로, 서명이 맞는지가 유일한 보호 장치다.
 *
 * ⚠️ 200 이 아니면 AdMob 이 재시도한다. 서명은 맞는데 지급할 수 없는 경우
 *    (콘솔의 확인용 요청, 한도 초과 등)도 200 으로 답한다.
 */
@Controller('ads/admob-ssv')
export class AdmobSsvController {
  private readonly logger = new Logger(AdmobSsvController.name);

  constructor(
    private verifier: AdmobSsvVerifier,
    private service: AdRewardsService,
  ) {}

  @Get()
  @HttpCode(200)
  async callback(@Req() req: Request) {
    // 파싱된 req.query 가 아니라 원문 쿼리로 검증해야 한다(서명 대상이 원문이다).
    const at = req.originalUrl.indexOf('?');
    const rawQuery = at < 0 ? '' : req.originalUrl.slice(at + 1);
    if (!(await this.verifier.verify(rawQuery))) {
      this.logger.warn('서명이 맞지 않는 SSV 콜백');
      throw new ForbiddenException();
    }

    const q = new URLSearchParams(rawQuery);
    const customData = q.get('custom_data') ?? '';
    const transactionId = q.get('transaction_id') ?? '';
    // 콘솔의 '콜백 URL 확인'은 custom_data 없이 온다. 주소가 살아 있다는 것만 답한다.
    if (!customData || !transactionId) return { ok: true };

    await this.service.grant({
      adUnit: q.get('ad_unit') ?? '',
      customData,
      transactionId,
      userId: q.get('user_id') ?? '',
    });
    return { ok: true };
  }
}
