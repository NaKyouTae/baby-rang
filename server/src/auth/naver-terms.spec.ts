import { ConfigService } from '@nestjs/config';
import { NaverService } from './naver.service';

// 네이버 약관 동의 내역(termCode) → 동의 항목 분류. 카카오와 같은 태그 규칙을 쓴다.

function mockAgreement(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  }) as unknown as typeof fetch;
}

const naver = () => new NaverService({} as ConfigService);

describe('NaverService.fetchConsents', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('동의한 약관 태그를 동의 항목으로 나눈다', async () => {
    mockAgreement({
      result: 'success',
      agreementInfos: [
        { termCode: 'service_20260408', agreeDate: '2026-11-25' },
        { termCode: 'privacy_20260408' },
        { termCode: 'third_party_20260408' },
      ],
    });

    await expect(naver().fetchConsents('token')).resolves.toEqual({
      terms: true,
      privacy: true,
      thirdParty: true,
    });
  });

  it('모르는 태그는 건너뛴다', async () => {
    mockAgreement({ agreementInfos: [{ termCode: 'age14_20260408' }] });

    await expect(naver().fetchConsents('token')).resolves.toEqual({});
  });

  it('조회가 실패해도 로그인을 막지 않는다', async () => {
    mockAgreement({}, false, 403);

    await expect(naver().fetchConsents('token')).resolves.toEqual({});
  });
});
