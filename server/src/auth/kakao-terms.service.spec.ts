import { KakaoTermsService } from './kakao-terms.service';

// 태그 → 동의 항목 분류가 이 서비스의 전부다. 여기가 틀어지면 간편가입에서 동의를
// 받고도 앱이 같은 약관을 다시 묻거나(사용자에겐 오류로 보인다), 동의하지 않은
// 선택 약관이 동의한 것으로 저장된다.

function mockTermsResponse(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  }) as unknown as typeof fetch;
}

describe('KakaoTermsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('태그 접두사로 동의 항목을 분류한다 (시행일이 바뀌어도 같다)', async () => {
    mockTermsResponse({
      service_terms: [
        { tag: 'service_20260408' },
        { tag: 'privacy_20270101' },
        { tag: 'marketing_20260408' },
      ],
    });

    const consents = await new KakaoTermsService().fetchConsents('token');

    expect(consents).toEqual({ terms: true, privacy: true, marketing: true });
  });

  it('구 응답 필드(allowed_service_terms)도 읽는다', async () => {
    mockTermsResponse({
      allowed_service_terms: [{ tag: 'third_party_20260408' }],
    });

    const consents = await new KakaoTermsService().fetchConsents('token');

    expect(consents).toEqual({ thirdParty: true });
  });

  it('agreed=false 인 약관은 동의로 보지 않는다', async () => {
    mockTermsResponse({
      service_terms: [
        { tag: 'service_20260408', agreed: true },
        { tag: 'marketing_20260408', agreed: false },
      ],
    });

    const consents = await new KakaoTermsService().fetchConsents('token');

    expect(consents).toEqual({ terms: true });
  });

  it('카카오싱크 미사용(오류 응답)이면 받은 동의가 없는 것으로 둔다', async () => {
    // 여기서 예외를 던지면 로그인 자체가 막힌다. 앱 약관 화면으로 되돌아가야 한다.
    mockTermsResponse({}, false, 403);

    const consents = await new KakaoTermsService().fetchConsents('token');

    expect(consents).toEqual({});
  });

  it('호출이 실패해도 로그인을 막지 않는다', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    await expect(
      new KakaoTermsService().fetchConsents('token'),
    ).resolves.toEqual({});
  });
});
