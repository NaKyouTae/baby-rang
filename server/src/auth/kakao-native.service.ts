import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 네이티브 앱(카카오톡 앱 로그인)이 받아온 access token 을 검증하고 프로필을 읽는다.
//
// 웹 로그인은 서버가 OAuth code 를 직접 교환하므로(kakao.strategy.ts) 토큰의 출처가
// 보장되지만, 앱은 카카오 SDK 가 받은 토큰을 서버에 건네주는 구조라 그 보장이 없다.
// 그래서 "이 토큰이 정말 우리 앱에서 발급된 것인가"를 반드시 되물어야 한다.
//
// 허용할 앱은 KAKAO_APP_ID 로 정한다. 쉼표로 여러 개를 넣을 수 있어서,
// 개발 서버는 테스트 앱과 운영 앱을 동시에 받아줄 수 있다.

const TOKEN_INFO_URL = 'https://kapi.kakao.com/v1/user/access_token_info';
const USER_ME_URL = 'https://kapi.kakao.com/v2/user/me';

export interface KakaoNativeProfile {
  /** 카카오 회원번호. 웹 로그인의 providerId 와 같은 값이어야 계정이 이어진다. */
  providerId: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
}

interface TokenInfoResponse {
  id?: number;
  app_id?: number;
}

interface UserMeResponse {
  id?: number;
  properties?: { nickname?: string; profile_image?: string };
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string; profile_image_url?: string };
  };
}

@Injectable()
export class KakaoNativeService {
  private readonly logger = new Logger(KakaoNativeService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 앱이 보낸 카카오 access token 을 검증하고 프로필을 돌려준다.
   *
   * ⚠️ access_token_info 로 app_id 를 확인하는 단계를 빼면 안 된다.
   * 카카오 access token 은 어느 앱에서 발급됐든 형태가 같아서, 검증 없이
   * /v2/user/me 만 부르면 **아무 카카오 앱에서 받은 토큰으로도 로그인이 된다**.
   * 공격자가 자기 앱을 만들어 받은 토큰을 우리 서버에 밀어넣으면 그 회원번호로
   * 계정이 열리므로, 토큰이 우리 앱 소유인지부터 확인한다.
   */
  async resolveProfile(accessToken: string): Promise<KakaoNativeProfile> {
    const allowedAppIds = this.allowedAppIds();
    if (allowedAppIds.length === 0) {
      // 설정 누락 상태로 통과시키면 검증 자체가 사라진다. 차라리 로그인을 막는다.
      this.logger.error(
        'KAKAO_APP_ID 가 설정되지 않아 네이티브 로그인을 거부한다.',
      );
      throw new InternalServerErrorException(
        '로그인 설정이 올바르지 않습니다.',
      );
    }

    const info = await this.get<TokenInfoResponse>(TOKEN_INFO_URL, accessToken);
    const appId = String(info.app_id ?? '');
    if (!allowedAppIds.includes(appId)) {
      this.logger.warn(
        `허용되지 않은 앱의 카카오 토큰이 들어왔다. app_id=${appId} allowed=${allowedAppIds.join(',')}`,
      );
      throw new UnauthorizedException('로그인 정보를 확인할 수 없습니다.');
    }

    const me = await this.get<UserMeResponse>(USER_ME_URL, accessToken);
    const providerId = String(me.id ?? info.id ?? '');
    if (!providerId) {
      throw new UnauthorizedException('로그인 정보를 확인할 수 없습니다.');
    }

    const account = me.kakao_account;
    return {
      providerId,
      // passport-kakao 의 displayName 과 같은 값을 우선 쓴다(웹/앱 프로필 일치).
      nickname: account?.profile?.nickname ?? me.properties?.nickname,
      email: account?.email,
      profileImage:
        account?.profile?.profile_image_url ?? me.properties?.profile_image,
    };
  }

  /**
   * 로그인을 허용할 카카오 앱 ID 목록.
   *
   * 쉼표로 여러 개를 넣을 수 있다(예: 개발 서버에서 테스트 앱 + 운영 앱 둘 다 허용).
   *
   * ⚠️ 운영 서버에는 운영 앱 ID 하나만 두는 편이 안전하다.
   * 카카오 회원번호는 앱마다 다르게 발급되므로, 운영 서버가 테스트 앱 토큰까지
   * 받아주면 같은 사람이 앱을 바꿔 로그인할 때 **다른 계정**으로 갈라진다.
   */
  private allowedAppIds(): string[] {
    const raw = this.configService.get<string>('KAKAO_APP_ID') ?? '';
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private async get<T>(url: string, accessToken: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      this.logger.error(`카카오 API 호출 실패: ${url}`, error as Error);
      throw new InternalServerErrorException(
        '로그인 처리 중 오류가 발생했습니다.',
      );
    }

    if (res.status === 401) {
      // 만료됐거나 폐기된 토큰. 앱이 다시 로그인시키면 된다.
      throw new UnauthorizedException('로그인 정보가 만료되었습니다.');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`카카오 API 오류: ${url} ${res.status} ${body}`);
      throw new InternalServerErrorException(
        '로그인 처리 중 오류가 발생했습니다.',
      );
    }

    return (await res.json()) as T;
  }
}
