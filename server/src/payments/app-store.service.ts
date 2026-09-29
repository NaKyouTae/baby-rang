import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';

// App Store Server API 클라이언트.
//
// google-play.service.ts 와 같은 방침으로 SDK 를 쓰지 않고 REST 를 직접 호출한다.
// 필요한 건 트랜잭션 조회 하나뿐이고, 인증(ES256 JWT)은 crypto 로 30줄이면 된다.
//
// ⚠️ 클라이언트가 보낸 JWS 를 검증하지 않고, transactionId 만 받아 Apple 에 **되묻는다.**
// StoreKit 이 앱에 내려주는 JWS 를 그대로 믿으려면 x5c 인증서 체인을 Apple Root CA 까지
// 검증해야 하는데, 그 구현을 틀리면 위조 영수증을 통과시키게 된다. Apple 의 인증된
// API 에 우리가 직접 물어보면 TLS + JWT 인증이 진위를 보장하므로 검증 코드가 사라진다.
// Play 경로가 구매 토큰으로 되묻는 것과 완전히 같은 구조다.

const PROD_BASE = 'https://api.storekit.itunes.apple.com';
const SANDBOX_BASE = 'https://api.storekit-sandbox.itunes.apple.com';

/**
 * 앱 번들 ID.
 * ⚠️ 제품 ID(kr.spectrify.baby_rang.temperament_report)와 철자가 다르다.
 *    번들은 하이픈, 제품 ID 는 Android 패키지명을 따라 언더스코어다. 바꾸지 말 것.
 */
const BUNDLE_ID = 'kr.spectrify.baby-rang';

/** JWSTransactionDecodedPayload 중 우리가 쓰는 필드. */
export interface AppStoreTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  /** 'Consumable' | 'Non-Consumable' | 'Auto-Renewable Subscription' | 'Non-Renewing Subscription' */
  type: string;
  /** epoch millis */
  purchaseDate: number;
  /** 환불·취소된 경우에만 있다. 있으면 콘텐츠를 열어주면 안 된다. */
  revocationDate?: number;
  revocationReason?: number;
  /** 'Production' | 'Sandbox' */
  environment: string;
  quantity: number;
  /** 'PURCHASED' | 'FAMILY_SHARED' */
  inAppOwnershipType?: string;
  /** 밀리 단위 정수(990원 → 990000). 기록용으로만 쓴다. */
  price?: number;
  currency?: string;
  storefront?: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

@Injectable()
export class AppStoreService {
  private readonly logger = new Logger(AppStoreService.name);

  /**
   * App Store Connect API 키(.p8) 를 읽는다.
   *
   * 콘솔 env 입력란이 멀티라인 값을 망가뜨리는 경우가 흔해서(개행 잘림, 따옴표 덧씌움)
   * PEM 원문과 base64 인코딩본을 모두 받는다. PLAY_SERVICE_ACCOUNT_JSON 과 같은 방침이다.
   */
  private privateKey(): string {
    const raw = process.env.APP_STORE_PRIVATE_KEY;
    if (!raw) {
      throw new BadRequestException(
        'APP_STORE_PRIVATE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }
    const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
    const pem = trimmed.includes('BEGIN')
      ? trimmed.replace(/\\n/g, '\n')
      : Buffer.from(trimmed, 'base64').toString('utf8');

    if (!pem.includes('BEGIN PRIVATE KEY')) {
      // 키 자체는 절대 남기지 않고, 형태만 알 수 있는 최소 정보로 진단한다.
      throw new BadRequestException(
        `APP_STORE_PRIVATE_KEY 를 읽을 수 없습니다. ` +
          `(길이 ${trimmed.length}, 시작 '${trimmed.slice(0, 5)}') ` +
          `.p8 파일 내용을 그대로 넣거나 base64 로 넣어주세요.`,
      );
    }
    return pem;
  }

  /**
   * App Store Server API 용 ES256 JWT 를 만든다.
   *
   * Play 와 달리 토큰 발급 엔드포인트가 없다. 우리가 서명한 JWT 를 그대로
   * Authorization 헤더에 싣는다. 유효기간은 최대 60분이지만, 캐시해 봐야
   * 서명 비용이 거의 없어서 매 호출마다 새로 만든다(만료 처리 버그가 사라진다).
   */
  private token(): string {
    const keyId = process.env.APP_STORE_KEY_ID;
    const issuerId = process.env.APP_STORE_ISSUER_ID;
    if (!keyId || !issuerId) {
      throw new BadRequestException(
        'APP_STORE_KEY_ID / APP_STORE_ISSUER_ID 환경변수가 설정되지 않았습니다.',
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const header = base64url(
      JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
    );
    const claim = base64url(
      JSON.stringify({
        iss: issuerId,
        iat: now,
        exp: now + 600,
        aud: 'appstoreconnect-v1',
        bid: BUNDLE_ID,
      }),
    );

    // ⚠️ dsaEncoding: 'ieee-p1363' 이 반드시 필요하다.
    // 기본값(der)으로 서명하면 ASN.1 DER 형식이 나오는데, JWS 는 R||S 를 이어붙인
    // 고정 길이(64바이트) 형식을 요구한다. 이걸 빠뜨리면 Apple 이 401 만 돌려주고,
    // 원인이 서명 형식이라는 단서는 어디에도 나오지 않는다.
    const signer = createSign('SHA256');
    signer.update(`${header}.${claim}`);
    const signature = base64url(
      signer.sign({ key: this.privateKey(), dsaEncoding: 'ieee-p1363' }),
    );

    return `${header}.${claim}.${signature}`;
  }

  /** JWS 의 페이로드(가운데 조각)를 디코드한다. 서명 검증은 하지 않는다 — 위 주석 참고. */
  private decodeJws(jws: string): AppStoreTransaction {
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('App Store 응답을 해석할 수 없습니다.');
    }
    try {
      return JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as AppStoreTransaction;
    } catch {
      throw new BadRequestException('App Store 응답을 해석할 수 없습니다.');
    }
  }

  private async fetchTransaction(
    base: string,
    transactionId: string,
    token: string,
  ) {
    return fetch(
      `${base}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /**
   * 트랜잭션 ID를 Apple 에 조회한다. 존재하지 않으면 404 → 위조로 간주.
   *
   * 프로덕션에 없으면 샌드박스를 한 번 더 본다. 두 환경은 완전히 분리돼 있고
   * 어느 쪽 구매인지 클라이언트 말로는 알 수 없다(그 말을 믿으면 샌드박스 구매로
   * 실제 콘텐츠를 여는 경로가 생긴다). Apple 이 권장하는 순서 그대로다.
   */
  async getTransaction(transactionId: string): Promise<AppStoreTransaction> {
    const token = this.token();

    let res = await this.fetchTransaction(PROD_BASE, transactionId, token);
    let environment = 'Production';

    if (res.status === 404) {
      res = await this.fetchTransaction(SANDBOX_BASE, transactionId, token);
      environment = 'Sandbox';
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        errorCode?: number;
        errorMessage?: string;
      };
      this.logger.warn(
        `트랜잭션 조회 실패 [${res.status}] tx=${transactionId} ` +
          `${body.errorCode ?? ''} ${body.errorMessage ?? ''}`,
      );
      throw new BadRequestException(
        res.status === 404
          ? '유효하지 않은 결제 정보입니다.'
          : (body.errorMessage ?? 'App Store 결제 조회에 실패했습니다.'),
      );
    }

    const json = (await res.json()) as { signedTransactionInfo?: string };
    if (!json.signedTransactionInfo) {
      throw new BadRequestException('App Store 응답에 결제 정보가 없습니다.');
    }

    const tx = this.decodeJws(json.signedTransactionInfo);

    // 다른 앱의 트랜잭션으로 우리 콘텐츠를 여는 경로를 막는다.
    // API 키는 계정 단위라 같은 계정의 다른 앱 트랜잭션도 조회되기 때문에,
    // 번들 ID 확인이 없으면 이 검증 전체가 의미를 잃는다.
    if (tx.bundleId !== BUNDLE_ID) {
      this.logger.warn(
        `번들 ID 불일치 tx=${transactionId} bundleId=${tx.bundleId}`,
      );
      throw new BadRequestException('유효하지 않은 결제 정보입니다.');
    }

    // 환불·취소된 트랜잭션은 콘텐츠를 열어주면 안 된다.
    if (tx.revocationDate) {
      throw new BadRequestException('취소된 결제입니다.');
    }

    this.logger.log(
      `트랜잭션 확인 tx=${tx.transactionId} product=${tx.productId} ` +
        `env=${tx.environment ?? environment} type=${tx.type}`,
    );

    return tx;
  }
}
