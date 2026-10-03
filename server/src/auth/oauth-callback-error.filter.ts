import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

// 소셜 로그인 콜백에서 터진 오류를 홈으로 되돌린다.
//
// 가입 화면을 없앤 뒤로 "동의 항목 부족"이나 토큰 교환 실패가 리다이렉트 한가운데에서
// 발생한다. 기본 동작대로 JSON 오류를 내보내면 사용자는 흰 화면에 갇혀 빠져나갈 길이
// 없다. 프런트는 loginError 를 보고 로그인 안내를 다시 띄운다(LoginErrorNotice).
@Catch()
@Injectable()
export class OAuthCallbackErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthCallbackErrorFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const clientUrl =
      this.configService.get('CLIENT_URL') || 'http://localhost:3000';

    const isConsentError =
      exception instanceof BadRequestException &&
      (exception.getResponse() as { code?: string })?.code ===
        'SOCIAL_CONSENT_REQUIRED';

    if (!isConsentError) {
      // 동의 부족은 사용자가 해결할 수 있는 상황이라 로그를 남기지 않는다.
      // 그 외는 설정 오류일 가능성이 높아 원인을 남겨야 한다.
      this.logger.error('소셜 로그인 콜백 실패', exception as Error);
    }

    return res.redirect(
      `${clientUrl}/home?loginError=${isConsentError ? 'social_consent' : 'login_failed'}`,
    );
  }
}
