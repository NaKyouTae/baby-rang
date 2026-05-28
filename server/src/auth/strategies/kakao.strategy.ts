import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
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
    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.KAKAO,
      providerId: String(profile.id),
      nickname: profile.displayName,
      email: kakaoAccount?.email,
      profileImage: kakaoAccount?.profile?.profile_image_url,
    });
    done(null, result);
  }
}
