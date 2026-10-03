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

    const body =
      exception instanceof BadRequestException
        ? (exception.getResponse() as { code?: string; missing?: string[] })
        : undefined;
    const isConsentError = body?.code === 'SOCIAL_CONSENT_REQUIRED';

    if (!isConsentError) {
      this.logger.error('소셜 로그인 콜백 실패', exception as Error);
      return res.redirect(`${clientUrl}/home?loginError=login_failed`);
    }

    // 어떤 항목이 비었는지 로그로 남긴다.
    // 사용자가 동의 화면에서 건너뛴 경우도 있지만, 개발자 콘솔에서 그 동의항목을
    // 아예 '사용 안 함'으로 둔 경우가 더 흔하다. 둘은 화면상 구분이 안 되므로
    // 항목 이름이 남아야 어디를 고칠지 알 수 있다. (개인정보는 담기지 않는다)
    const missing = body?.missing ?? [];
    this.logger.warn(
      `소셜 동의 항목 부족으로 가입 중단: ${missing.join(', ') || '알 수 없음'}`,
    );

    const query = new URLSearchParams({ loginError: 'social_consent' });
    if (missing.length > 0) query.set('missing', missing.join(','));
    return res.redirect(`${clientUrl}/home?${query.toString()}`);
  }
}
