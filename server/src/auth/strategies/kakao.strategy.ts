import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
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

// 동의항목(scope)을 인증 요청에 싣지 않는다.
//
// 카카오는 scope 를 생략하면 콘솔(카카오 로그인 > 동의항목)에 켜 둔 항목을 그대로
// 동의 화면에 띄운다. 반대로 scope 를 적어 보내면 콘솔에서 '사용 안 함'인 항목이
// 하나라도 섞이는 순간 로그인 전체가 KOE205 로 막힌다 — 코드와 콘솔을 양쪽에서
// 맞춰야 하는데, 콘솔 쪽은 검수·비즈앱 승인에 따라 수시로 바뀌므로 어긋나기 쉽다.
//
// 그래서 "무엇을 받을지"는 콘솔 한 곳에서만 정한다. 네이버도 같은 방식이다.
// 서버가 요구하는 항목(이름·전화번호)이 콘솔에서 꺼져 있으면 로그인은 되지만
// 가입이 SOCIAL_CONSENT_REQUIRED 로 막히고, 그 사실이 사용자에게 안내된다.

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
    });
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
