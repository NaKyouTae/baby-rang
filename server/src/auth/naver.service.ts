import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  normalizeAgeRange,
  normalizeGender,
  normalizeName,
  normalizePhone,
} from './social-profile';

// 네이버 아이디로 로그인.
//
// 카카오와 달리 passport 전략을 쓰지 않고 직접 호출한다. 네이버용 passport 전략은
// 관리가 멈춘 지 오래고, 우리가 필요한 건 code 교환과 프로필 조회뿐이라
// 의존성을 늘리지 않는 쪽을 택했다. 네이티브 앱 로그인도 같은 서비스를 쓴다.
//
// 동의항목(이름·전화번호·성별·연령대)은 네이버 개발자센터의 애플리케이션 설정에서
// 정하므로 인증 URL 에 scope 를 싣지 않는다. 카카오(scope 파라미터 필요)와 다른 점이다.

const AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize';
const TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const PROFILE_URL = 'https://openapi.naver.com/v1/nid/me';

export interface NaverProfile {
  providerId: string;
  name?: string;
  phone?: string;
  gender?: string;
  ageRange?: string;
  email?: string;
  profileImage?: string;
}

export interface NaverTokens {
  accessToken: string;
  refreshToken?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface ProfileResponse {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    name?: string;
    nickname?: string;
    email?: string;
    gender?: string;
    age?: string;
    mobile?: string;
    profile_image?: string;
  };
}

@Injectable()
export class NaverService {
  private readonly logger = new Logger(NaverService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 웹 로그인 시작 URL. state 는 호출한 쪽에서 서명해 넘긴다(CSRF 방지).
   *
   * @param reprompt 이미 동의한 사용자에게도 동의 화면을 다시 띄운다.
   *   추가 정보 화면에서 재동의를 받을 때만 쓴다. 평소 로그인에 켜두면 매번
   *   동의 화면을 거쳐야 해서 로그인이 번거로워진다.
   */
  buildAuthorizeUrl(state: string, reprompt = false): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId(),
      redirect_uri: this.callbackUrl(),
      state,
      ...(reprompt ? { auth_type: 'reprompt' } : {}),
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  /** 웹 콜백의 code 를 토큰으로 바꾼다. */
  async exchangeCode(code: string, state: string): Promise<NaverTokens> {
    const token = await this.token({
      grant_type: 'authorization_code',
      code,
      state,
    });
    if (!token.access_token) {
      throw new UnauthorizedException('로그인 정보를 확인할 수 없습니다.');
    }
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    };
  }

  /**
   * 네이티브 앱이 보낸 토큰을 검증한다.
   *
   * ⚠️ 앱이 준 access token 을 그대로 믿고 프로필만 조회하면 안 된다.
   * 네이버 access token 은 어느 애플리케이션에서 발급됐든 형태가 같아서,
   * 공격자가 자기 앱에서 받은 토큰을 밀어넣어도 /v1/nid/me 는 응답한다.
   *
   * 카카오에는 토큰의 app_id 를 되묻는 API 가 있지만(kakao-native.service.ts)
   * 네이버에는 없다. 대신 refresh token 은 client_id·client_secret 과 함께여야만
   * 갱신되므로, 갱신에 성공한다는 사실 자체가 "우리 앱이 발급한 토큰"의 증거가 된다.
   * 그래서 갱신으로 받은 access token 만 신뢰하고 프로필을 조회한다.
   */
  async verifyNativeTokens(refreshToken: string): Promise<NaverTokens> {
    const token = await this.token({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (!token.access_token) {
      this.logger.warn(
        '네이버 refresh token 갱신 실패 — 다른 앱의 토큰일 수 있다.',
      );
      throw new UnauthorizedException('로그인 정보를 확인할 수 없습니다.');
    }
    return {
      accessToken: token.access_token,
      // 네이버는 갱신 시 refresh token 을 다시 주지 않는다. 기존 값을 그대로 쓴다.
      refreshToken: token.refresh_token ?? refreshToken,
    };
  }

  async fetchProfile(accessToken: string): Promise<NaverProfile> {
    let res: Response;
    try {
      res = await fetch(PROFILE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      this.logger.error('네이버 프로필 조회 실패', error as Error);
      throw new InternalServerErrorException(
        '로그인 처리 중 오류가 발생했습니다.',
      );
    }

    if (res.status === 401) {
      throw new UnauthorizedException('로그인 정보가 만료되었습니다.');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`네이버 프로필 오류: ${res.status} ${body}`);
      throw new InternalServerErrorException(
        '로그인 처리 중 오류가 발생했습니다.',
      );
    }

    const data = (await res.json()) as ProfileResponse;
    const profile = data.response;
    // resultcode 가 '00' 이 아니면 HTTP 200 이어도 실패다.
    if (data.resultcode !== '00' || !profile?.id) {
      this.logger.error(`네이버 프로필 응답 이상: ${JSON.stringify(data)}`);
      throw new UnauthorizedException('로그인 정보를 확인할 수 없습니다.');
    }

    return {
      providerId: profile.id,
      name: normalizeName(profile.name),
      phone: normalizePhone(profile.mobile),
      gender: normalizeGender(profile.gender),
      ageRange: normalizeAgeRange(profile.age),
      email: profile.email,
      profileImage: profile.profile_image,
    };
  }

  /**
   * 연동해제(회원탈퇴). 실패해도 탈퇴 자체를 막지 않는다.
   *
   * 카카오는 admin key 로 서버가 단독 해제할 수 있지만, 네이버는 그 사용자의
   * 토큰이 있어야만 해제된다. 토큰이 이미 만료됐다면 해제할 방법이 없는데,
   * 그걸 이유로 탈퇴를 거부하면 사용자가 계정에 갇힌다.
   */
  async unlink(refreshToken: string): Promise<boolean> {
    try {
      const refreshed = await this.token({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      if (!refreshed.access_token) return false;

      const deleted = await this.token({
        grant_type: 'delete',
        access_token: refreshed.access_token,
        service_provider: 'NAVER',
      });
      return !deleted.error;
    } catch (error) {
      this.logger.warn(`네이버 연동해제 실패(탈퇴는 계속 진행): ${error}`);
      return false;
    }
  }

  private async token(params: Record<string, string>): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      ...params,
    });

    let res: Response;
    try {
      res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (error) {
      this.logger.error('네이버 토큰 요청 실패', error as Error);
      throw new InternalServerErrorException(
        '로그인 처리 중 오류가 발생했습니다.',
      );
    }

    // 네이버는 실패도 200 + error 필드로 주는 경우가 있어 본문까지 봐야 한다.
    const data = (await res.json().catch(() => ({}))) as TokenResponse;
    if (data.error) {
      this.logger.warn(
        `네이버 토큰 오류: ${data.error} ${data.error_description ?? ''}`,
      );
    }
    return data;
  }

  private clientId(): string {
    return this.required('NAVER_CLIENT_ID');
  }

  private clientSecret(): string {
    return this.required('NAVER_CLIENT_SECRET');
  }

  private callbackUrl(): string {
    return this.required('NAVER_CALLBACK_URL');
  }

  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      // 설정이 빠진 채로 흘러가면 네이버가 돌려주는 오류 화면에서 원인을 알기 어렵다.
      this.logger.error(`${key} 가 설정되지 않았다.`);
      throw new InternalServerErrorException(
        '로그인 설정이 올바르지 않습니다.',
      );
    }
    return value;
  }
}
