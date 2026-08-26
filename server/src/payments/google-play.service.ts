import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';

// Google Play Developer API(androidpublisher) 클라이언트.
//
// googleapis 패키지를 쓰지 않고 REST를 직접 호출한다. 필요한 건 구매 조회와 소비 두 개뿐인데
// googleapis 는 의존성이 매우 크고, 이 프로젝트는 토스 연동도 fetch 로 하고 있어 결이 맞다.
// 서비스 계정 인증(JWT bearer)은 표준 흐름이라 crypto 로 30줄이면 된다.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const PACKAGE_NAME = 'kr.spectrify.baby_rang';

/** purchases.products.get 응답 중 우리가 쓰는 필드. */
export interface PlayPurchase {
  /** 0=구매완료, 1=취소됨, 2=대기중 */
  purchaseState: number;
  /** 0=미소비, 1=소비됨 */
  consumptionState: number;
  /** 0=미승인, 1=승인됨 */
  acknowledgementState: number;
  /** 'GPA.xxxx-xxxx-xxxx-xxxxx'. 테스트 구매에는 없을 수 있다. */
  orderId?: string;
  /** epoch millis (문자열로 온다) */
  purchaseTimeMillis?: string;
  /** 0=테스트(라이선스 테스터), 1=프로모, 2=리워드 */
  purchaseType?: number;
  regionCode?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

@Injectable()
export class GooglePlayService {
  private readonly logger = new Logger(GooglePlayService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  private serviceAccount(): ServiceAccount {
    const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      throw new BadRequestException(
        'PLAY_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다.',
      );
    }
    let parsed: ServiceAccount;
    try {
      parsed = JSON.parse(raw) as ServiceAccount;
    } catch {
      throw new BadRequestException(
        'PLAY_SERVICE_ACCOUNT_JSON 이 올바른 JSON 이 아닙니다.',
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new BadRequestException(
        'PLAY_SERVICE_ACCOUNT_JSON 에 client_email/private_key 가 없습니다.',
      );
    }
    // env 로 넣을 때 개행이 \n 문자열로 들어오는 경우가 흔하다.
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return parsed;
  }

  /** 서비스 계정 JWT로 액세스 토큰을 받아 만료 1분 전까지 재사용한다. */
  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value;
    }

    const sa = this.serviceAccount();
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = base64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        exp: now + 3600,
        iat: now,
      }),
    );

    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claim}`);
    const signature = base64url(signer.sign(sa.private_key));
    const assertion = `${header}.${claim}.${signature}`;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || !json.access_token) {
      this.logger.error(
        `Play 액세스 토큰 발급 실패: ${json.error ?? res.status} ${json.error_description ?? ''}`,
      );
      throw new BadRequestException(
        'Google Play 인증에 실패했습니다. 서비스 계정 설정을 확인해 주세요.',
      );
    }

    this.cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
  }

  private async call(path: string, method: 'GET' | 'POST') {
    const token = await this.accessToken();
    const res = await fetch(`${API_BASE}/applications/${PACKAGE_NAME}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    return res;
  }

  /** 구매 토큰을 Play 에 조회한다. 존재하지 않으면 404 → 위조로 간주. */
  async getPurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<PlayPurchase> {
    const res = await this.call(
      `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`,
      'GET',
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; status?: string };
      };
      this.logger.warn(
        `구매 조회 실패 [${res.status}] product=${productId} ${body.error?.status ?? ''} ${body.error?.message ?? ''}`,
      );
      throw new BadRequestException(
        res.status === 404
          ? '유효하지 않은 구매 토큰입니다.'
          : (body.error?.message ?? 'Google Play 구매 조회에 실패했습니다.'),
      );
    }

    return (await res.json()) as PlayPurchase;
  }

  /**
   * 구매를 소비 처리한다.
   *
   * ⚠️ 소비형 상품은 3일 안에 소비(또는 승인)하지 않으면 구글이 자동 환불한다.
   * consume 은 승인(acknowledge)까지 겸하므로 별도 acknowledge 호출이 필요 없다.
   * 소비해야 같은 상품을 다시 살 수 있다 — 기질 리포트는 재검사마다 구매하므로 필수다.
   */
  async consume(productId: string, purchaseToken: string): Promise<void> {
    const res = await this.call(
      `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:consume`,
      'POST',
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      // 소비 실패는 결제 자체를 무효화할 사유가 아니다. 사용자는 이미 돈을 냈고
      // 리포트를 받아야 한다. 다만 방치하면 자동 환불되므로 반드시 로그로 남긴다.
      this.logger.error(
        `구매 소비 실패 [${res.status}] product=${productId} ${body.error?.message ?? ''} — 3일 내 소비되지 않으면 자동 환불됩니다.`,
      );
    }
  }
}
