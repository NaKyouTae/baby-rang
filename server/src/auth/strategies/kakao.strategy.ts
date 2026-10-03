import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOption } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { AuthService } from '../auth.service';
import { KakaoTermsService } from '../kakao-terms.service';
import {
  normalizeAgeRange,
  normalizeGender,
  normalizeName,
  normalizePhone,
} from '../social-profile';

// 요청할 카카오 동의항목.
//
// ⚠️ 카카오 개발자 콘솔 > 카카오 로그인 > 동의항목에 같은 항목이 켜져 있어야 한다.
//    켜지지 않은 scope 를 요청하면 로그인 자체가 KOE006 으로 막힌다.
// ⚠️ name·phone_number 는 비즈니스 앱(비즈앱) + 검수 승인이 있어야 열린다.
const KAKAO_SCOPES = [
  'account_email',
  'profile_image',
  'name',
  'phone_number',
  'gender',
  'age_range',
];

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private kakaoTermsService: KakaoTermsService,
  ) {
    super({
      clientID: configService.get('KAKAO_CLIENT_ID')!,
      clientSecret: configService.get('KAKAO_CLIENT_SECRET')!,
      callbackURL: configService.get('KAKAO_CALLBACK_URL')!,
      // @types/passport-kakao 의 StrategyOption 에는 scope 가 빠져 있지만,
      // passport-kakao 는 passport-oauth2 를 그대로 상속하고 scopeSeparator 를
      // ',' 로 지정해 두어 동작한다(dist/Strategy.js). 타입만 보정한다.
      scope: KAKAO_SCOPES,
    } as StrategyOption);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (...args: unknown[]) => void,
  ) {
    const kakaoAccount = profile._json?.kakao_account;
    // 간편가입에서 받은 약관 동의. 카카오싱크 미사용이면 빈 객체라 앱이 직접 받는다.
    const consents = await this.kakaoTermsService.fetchConsents(accessToken);
    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.KAKAO,
      providerId: String(profile.id),
      name: normalizeName(kakaoAccount?.name),
      phone: normalizePhone(kakaoAccount?.phone_number),
      gender: normalizeGender(kakaoAccount?.gender),
      ageRange: normalizeAgeRange(kakaoAccount?.age_range),
      email: kakaoAccount?.email,
      profileImage: kakaoAccount?.profile?.profile_image_url,
      consents,
    });
    done(null, result);
  }
}
