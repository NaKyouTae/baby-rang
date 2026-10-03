import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KakaoNativeService } from './kakao-native.service';

// 이 서비스의 핵심은 "들어온 토큰이 우리 앱 것인가" 한 가지다.
// 그 판정이 무너지면 아무 카카오 앱에서 받은 토큰으로 로그인이 뚫리므로,
// 허용 목록 파싱과 거절 동작을 테스트로 고정해 둔다.

function makeService(appIdEnv: string | undefined) {
  const config = {
    get: (key: string) => (key === 'KAKAO_APP_ID' ? appIdEnv : undefined),
  } as unknown as ConfigService;
  return new KakaoNativeService(config);
}

function mockKakaoResponses(appId: number) {
  const json = (body: unknown) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
  global.fetch = jest
    .fn()
    // 1) access_token_info
    .mockResolvedValueOnce(json({ id: 42, app_id: appId }))
    // 2) /v2/user/me
    .mockResolvedValueOnce(
      json({
        id: 42,
        kakao_account: {
          email: 'a@b.com',
          name: '김아기',
          phone_number: '+82 10-1234-5678',
          gender: 'female',
          age_range: '30~39',
          profile: { nickname: '아기랑', profile_image_url: 'https://img' },
        },
      }),
    ) as unknown as typeof fetch;
}

describe('KakaoNativeService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('허용 목록에 있는 앱의 토큰이면 프로필을 돌려준다', async () => {
    mockKakaoResponses(1328997);
    const profile = await makeService('1328997').resolveProfile('token');

    expect(profile).toEqual({
      providerId: '42',
      // 동의항목 값은 저장 형식으로 정규화해서 넘어온다(social-profile.ts).
      name: '김아기',
      phone: '01012345678',
      gender: 'female',
      ageRange: '30-39',
      email: 'a@b.com',
      profileImage: 'https://img',
    });
  });

  it('쉼표로 여러 앱을 허용한다 (공백이 섞여도 무시)', async () => {
    mockKakaoResponses(999888);
    const profile =
      await makeService(' 1328997 , 999888 ').resolveProfile('token');

    expect(profile.providerId).toBe('42');
  });

  it('허용 목록에 없는 앱의 토큰은 거절한다', async () => {
    mockKakaoResponses(1328997);

    await expect(makeService('999888').resolveProfile('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('KAKAO_APP_ID 가 비어 있으면 검증이 무력화되므로 아예 막는다', async () => {
    mockKakaoResponses(1328997);

    await expect(
      makeService(undefined).resolveProfile('token'),
    ).rejects.toThrow(InternalServerErrorException);
    await expect(makeService('  ,  ').resolveProfile('token')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
