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

// .p8 개인키를 올바른 PKCS8 PEM 으로 정규화한다.
// 환경변수(Cloudtype 등)에 넣는 방식이 제각각이라 — 한 줄 + \n 이스케이프,
// 줄바꿈 없음, 따옴표 감싸짐 등 — base64 본문만 추출해 64자 단위로 재조립한다.
// (줄바꿈이 깨지면 jsonwebtoken 이 "must be an asymmetric key" 로 ES256 서명 실패)
function normalizeApplePrivateKey(raw: string): string {
  const base64 = raw
    .replace(/\\n/g, '\n') // \n 이스케이프 복원
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/[^A-Za-z0-9+/=]/g, ''); // 본문 외 문자(공백·따옴표·% 등) 제거
  const body = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
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
      // .p8 개인키 내용. 입력 형식과 무관하게 올바른 PEM 으로 정규화.
      key: normalizeApplePrivateKey(
        configService.get<string>('APPLE_PRIVATE_KEY')!,
      ),
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
