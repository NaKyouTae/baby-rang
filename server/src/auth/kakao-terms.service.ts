import { Injectable, Logger } from '@nestjs/common';

// 카카오 간편가입(카카오싱크)에서 받은 서비스 약관 동의 내역을 읽어 온다.
//
// 간편가입을 쓰면 약관 동의가 카카오 동의 화면에서 함께 끝난다. 그 결과를 여기서
// 가져와 회원가입에 그대로 반영하면, 사용자는 앱에서 같은 약관에 두 번 동의하지 않는다.
//
// ⚠️ 카카오싱크가 켜져 있지 않으면 이 API 는 빈 목록이나 오류를 돌려준다.
//    그때는 앱의 약관 동의 화면으로 되돌아가야 하므로, 실패를 로그인 실패로 번지게
//    하지 않고 "받은 동의 없음"으로 다룬다.
//
// 태그는 카카오 개발자 콘솔 > 카카오 로그인 > 간편가입 에 등록한 값이고,
// 우리가 정한 규칙은 `{키워드}_{시행일}` 이다(예: service_20260408).
// 시행일이 바뀌어도 키워드는 그대로이므로 접두사로 분류한다.

const SERVICE_TERMS_URL =
  'https://kapi.kakao.com/v2/user/service_terms?result=agreed_service_terms';

export type KakaoConsents = {
  terms?: boolean;
  privacy?: boolean;
  marketing?: boolean;
  thirdParty?: boolean;
};

const TAG_PREFIXES: Array<[string, keyof KakaoConsents]> = [
  ['service', 'terms'],
  ['privacy', 'privacy'],
  ['marketing', 'marketing'],
  ['third_party', 'thirdParty'],
];

interface ServiceTermsResponse {
  // 응답 필드명이 버전에 따라 다르다. 둘 다 "동의한 약관" 목록이다.
  service_terms?: Array<{ tag?: string; agreed?: boolean }>;
  allowed_service_terms?: Array<{ tag?: string; agreed?: boolean }>;
}

@Injectable()
export class KakaoTermsService {
  private readonly logger = new Logger(KakaoTermsService.name);

  /**
   * 사용자가 간편가입에서 동의한 약관을 우리 동의 항목으로 바꿔 돌려준다.
   * 받은 것이 없으면 빈 객체 — 호출한 쪽은 앱에서 직접 동의를 받아야 한다.
   */
  async fetchConsents(accessToken: string): Promise<KakaoConsents> {
    let res: Response;
    try {
      res = await fetch(SERVICE_TERMS_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      this.logger.warn(`카카오 약관 동의내역 조회 실패: ${error}`);
      return {};
    }

    if (!res.ok) {
      // 카카오싱크 미사용(또는 미심사)이면 여기로 온다. 정상 경로다.
      const body = await res.text().catch(() => '');
      this.logger.warn(`카카오 약관 동의내역 없음: ${res.status} ${body}`);
      return {};
    }

    const data = (await res.json().catch(() => ({}))) as ServiceTermsResponse;
    const items = data.service_terms ?? data.allowed_service_terms ?? [];

    const consents: KakaoConsents = {};
    for (const item of items) {
      const tag = item?.tag?.toLowerCase();
      if (!tag) continue;
      // agreed 가 명시적으로 false 면 동의하지 않은 것이다(필드가 없으면 동의 목록).
      if (item.agreed === false) continue;

      const matched = TAG_PREFIXES.find(([prefix]) => tag.startsWith(prefix));
      if (!matched) {
        // 콘솔에 새 약관을 등록했는데 여기 분류를 안 넣은 경우. 조용히 흘리면
        // "동의했는데 앱이 또 묻는" 증상만 남고 원인이 드러나지 않는다.
        this.logger.warn(`분류되지 않은 카카오 약관 태그: ${tag}`);
        continue;
      }
      consents[matched[1]] = true;
    }
    return consents;
  }
}
