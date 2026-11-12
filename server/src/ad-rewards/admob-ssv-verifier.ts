import { Injectable, Logger } from '@nestjs/common';
import { createPublicKey, verify, type KeyObject } from 'crypto';

/** AdMob 이 SSV 콜백 서명에 쓰는 공개키 목록. 키는 가끔 교체된다. */
const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
/** 키 목록을 다시 받는 주기. 모르는 key_id 가 오면 주기와 상관없이 다시 받는다. */
const KEYS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * AdMob 보상형 광고 서버 측 확인(SSV) 콜백의 서명 검증.
 *
 * 콜백 주소는 공개돼 있어 누구나 부를 수 있다. 서명이 맞는 요청만 Google 이 보낸 것이다.
 * https://developers.google.com/admob/android/ssv
 */
@Injectable()
export class AdmobSsvVerifier {
  private readonly logger = new Logger(AdmobSsvVerifier.name);
  private keys = new Map<string, KeyObject>();
  private fetchedAt = 0;

  /**
   * rawQuery — URL 의 '?' 뒤 문자열 그대로. 디코딩하거나 순서를 바꾸면 서명이 깨진다.
   *
   * 서명 대상은 signature 앞까지의 쿼리다. AdMob 은 signature 와 key_id 를
   * 항상 맨 끝에 붙인다.
   */
  async verify(rawQuery: string): Promise<boolean> {
    const sigAt = rawQuery.indexOf('&signature=');
    if (sigAt < 0) return false;
    const message = rawQuery.slice(0, sigAt);
    const params = new URLSearchParams(rawQuery);
    const signature = params.get('signature');
    const keyId = params.get('key_id');
    if (!signature || !keyId) return false;

    const key = await this.key(keyId);
    if (!key) {
      this.logger.warn(`알 수 없는 key_id: ${keyId}`);
      return false;
    }
    try {
      // 서명은 URL-safe base64 로 인코딩된 DER 형식 ECDSA(SHA-256)다.
      return verify(
        'sha256',
        Buffer.from(message),
        key,
        Buffer.from(signature, 'base64url'),
      );
    } catch {
      return false;
    }
  }

  private async key(keyId: string) {
    const stale = Date.now() - this.fetchedAt > KEYS_TTL_MS;
    if (stale || !this.keys.has(keyId)) await this.refresh();
    return this.keys.get(keyId);
  }

  private async refresh() {
    try {
      const res = await fetch(KEYS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        keys?: { keyId: number | string; pem: string }[];
      };
      const next = new Map<string, KeyObject>();
      for (const k of body.keys ?? []) {
        next.set(String(k.keyId), createPublicKey(k.pem));
      }
      this.keys = next;
      this.fetchedAt = Date.now();
    } catch (err) {
      // 받아 둔 키가 있으면 그대로 쓴다. 다음 콜백에서 다시 시도한다.
      this.logger.warn(`공개키를 받지 못했다: ${(err as Error).message}`);
    }
  }

  /** 테스트용. 네트워크 없이 키를 심는다. */
  setKeysForTest(keys: Record<string, KeyObject>) {
    this.keys = new Map(Object.entries(keys));
    this.fetchedAt = Date.now();
  }
}
