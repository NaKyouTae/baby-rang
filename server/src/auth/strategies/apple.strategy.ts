import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@nicokaiser/passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { AuthService } from '../auth.service';

// Apple 프로필. @nicokaiser/passport-apple 가 id_token + form_post 의 user 필드를
// 파싱해 채워준다. 이름은 최초 인증 시에만 내려온다.
interface AppleProfile {
  id: string;
  name?: { firstName?: string; lastName?: string };
  email?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Services ID (앱 번들 ID 가 아니라 웹용 식별자). 예: kr.spectrify.baby-rang.web
      clientID: configService.get('APPLE_CLIENT_ID')!,
      teamID: configService.get('APPLE_TEAM_ID')!,
      keyID: configService.get('APPLE_KEY_ID')!,
      // .p8 개인키 내용. 환경변수에 한 줄로 넣을 때 \n 이스케이프를 복원한다.
      key: configService
        .get<string>('APPLE_PRIVATE_KEY')!
        .replace(/\\n/g, '\n'),
      callbackURL: configService.get('APPLE_CALLBACK_URL')!,
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: AppleProfile,
    done: (...args: unknown[]) => void,
  ) {
    // 한국식 표기(성+이름). 이름은 최초 1회만 제공되므로 없으면 undefined.
    const nickname = profile.name
      ? [profile.name.lastName, profile.name.firstName].filter(Boolean).join('')
      : undefined;

    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.APPLE,
      providerId: profile.id,
      nickname: nickname || undefined,
      email: profile.email,
    });
    done(null, result);
  }
}
