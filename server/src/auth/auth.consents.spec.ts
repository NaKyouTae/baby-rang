import { AuthProvider, ConsentType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, OAuthProfile } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NaverService } from './naver.service';

// 소셜에서 받은 약관 동의가 실제로 DB 로 내려가는지 고정한다.
//
// 가입 화면을 없앤 뒤로 동의를 기록하는 경로가 createUserFromSocial 한 곳뿐이다.
// 여기가 조용히 어긋나면 "동의는 받았는데 기록이 없는" 상태가 되고, 분쟁·감사 때
// 증빙이 불가능해진다. 화면으로는 확인할 수 없는 부분이라 테스트로 묶어 둔다.

type Captured = {
  user?: Record<string, unknown>;
  consentLogs?: Array<{ type: ConsentType; agreed: boolean }>;
  account?: Record<string, unknown>;
  /** 기존 회원에 덧붙인 소셜 계정 (전화번호로 연결된 경우) */
  linkedAccount?: Record<string, unknown>;
  syncedUserId?: string;
};

function makeService(
  existingAccount: { id: string; userId: string } | null,
  usersWithSamePhone: Array<{ id: string }> = [],
) {
  const captured: Captured = {};

  const tx = {
    user: {
      create: (args: { data: Record<string, unknown> }) => {
        captured.user = args.data;
        captured.account = (
          args.data.accounts as { create: Record<string, unknown> }
        )?.create;
        return Promise.resolve({ id: 'user-1' });
      },
      update: () => Promise.resolve({}),
    },
    group: {
      create: () => Promise.resolve({ id: 'group-1' }),
      findUnique: () => Promise.resolve(null), // 그룹 코드 중복 없음
    },
    consentLog: {
      createMany: (args: {
        data: Array<{ type: ConsentType; agreed: boolean }>;
      }) => {
        captured.consentLogs = args.data;
        return Promise.resolve({ count: args.data.length });
      },
    },
  };

  const prisma = {
    account: {
      findUnique: () => Promise.resolve(existingAccount),
      update: () => Promise.resolve({}),
      create: (args: { data: Record<string, unknown> }) => {
        captured.linkedAccount = args.data;
        return Promise.resolve({ id: 'acc-new' });
      },
    },
    user: {
      update: (args: { where: { id: string } }) => {
        captured.syncedUserId = args.where.id;
        return Promise.resolve({});
      },
      findMany: () => Promise.resolve(usersWithSamePhone),
    },
    $transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
  } as unknown as PrismaService;

  const service = new AuthService(
    prisma,
    { sign: () => 'jwt' } as unknown as JwtService,
    { get: () => undefined } as unknown as ConfigService,
    {} as unknown as NaverService,
  );

  return { service, captured };
}

const baseProfile: OAuthProfile = {
  provider: AuthProvider.KAKAO,
  providerId: '42',
  name: '김아기',
  phone: '01012345678',
  gender: 'female',
  ageRange: '30-39',
};

function agreedTypes(captured: Captured) {
  return (captured.consentLogs ?? [])
    .filter((log) => log.agreed)
    .map((log) => log.type)
    .sort();
}

describe('소셜 가입 시 약관 동의 저장', () => {
  it('카카오 간편가입에서 받은 동의가 컬럼과 동의 로그에 모두 남는다', async () => {
    const { service, captured } = makeService(null);

    await service.resolveOAuthLogin({
      ...baseProfile,
      consents: { terms: true, privacy: true, marketing: true },
    });

    // 필수 2종 + 동의한 마케팅은 시각이 찍히고, 미동의한 제3자 제공은 null 이어야 한다.
    expect(captured.user?.termsAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.privacyAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.marketingAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.thirdPartyAgreedAt).toBeNull();

    // 마케팅은 2년 재확인 대상이라 만료일이 함께 있어야 한다.
    expect(captured.user?.marketingExpiresAt).toBeInstanceOf(Date);

    expect(agreedTypes(captured)).toEqual([
      ConsentType.MARKETING,
      ConsentType.PRIVACY,
      ConsentType.TERMS,
    ]);
    // 동의하지 않은 항목도 '미동의'로 기록해야 이력이 완결된다.
    expect(captured.consentLogs).toHaveLength(4);
  });

  it('제3자 제공까지 동의하면 그대로 반영된다', async () => {
    const { service, captured } = makeService(null);

    await service.resolveOAuthLogin({
      ...baseProfile,
      consents: { terms: true, privacy: true, thirdParty: true },
    });

    expect(captured.user?.thirdPartyAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.marketingAgreedAt).toBeNull();
    expect(captured.user?.marketingExpiresAt).toBeNull();
  });

  it('네이버처럼 약관을 받아올 수 없는 경로에서도 필수 동의는 기록된다', async () => {
    // 네이버에는 약관 동의 기능이 없다. 로그인 화면 고지가 동의의 근거이고,
    // 선택 약관은 받은 적이 없으므로 미동의로 남아야 한다.
    const { service, captured } = makeService(null);

    await service.resolveOAuthLogin({
      ...baseProfile,
      provider: AuthProvider.NAVER,
      consents: undefined,
    });

    expect(captured.user?.termsAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.privacyAgreedAt).toBeInstanceOf(Date);
    expect(captured.user?.marketingAgreedAt).toBeNull();
    expect(captured.user?.thirdPartyAgreedAt).toBeNull();
    expect(agreedTypes(captured)).toEqual([
      ConsentType.PRIVACY,
      ConsentType.TERMS,
    ]);
  });

  it('소셜이 준 회원 정보가 그대로 저장된다', async () => {
    const { service, captured } = makeService(null);

    await service.resolveOAuthLogin({
      ...baseProfile,
      refreshToken: 'naver-refresh',
      consents: { terms: true, privacy: true },
    });

    expect(captured.user?.name).toBe('김아기');
    expect(captured.user?.phone).toBe('01012345678');
    expect(captured.user?.gender).toBe('female');
    expect(captured.user?.ageRange).toBe('30-39');
    expect(captured.user?.onboardedAt).toBeInstanceOf(Date);
    // 네이버 연동해제에 쓸 토큰은 account 에 함께 저장된다.
    expect(captured.account?.refreshToken).toBe('naver-refresh');
  });

  it('이름·전화번호 동의를 건너뛰면 가입을 막는다', async () => {
    const { service, captured } = makeService(null);

    await expect(
      service.resolveOAuthLogin({
        ...baseProfile,
        phone: undefined,
        consents: { terms: true, privacy: true },
      }),
    ).rejects.toMatchObject({
      response: { code: 'SOCIAL_CONSENT_REQUIRED', missing: ['phone'] },
    });
    // 반쯤 만들어진 회원이 남으면 안 된다.
    expect(captured.user).toBeUndefined();
  });

  it('재로그인은 새 회원을 만들지 않는다 (동의 이력도 덮어쓰지 않는다)', async () => {
    const { service, captured } = makeService({
      id: 'acc-1',
      userId: 'user-1',
    });

    const result = await service.resolveOAuthLogin({
      ...baseProfile,
      consents: { terms: true, privacy: true, marketing: true },
    });

    expect(result.userId).toBe('user-1');
    expect(captured.user).toBeUndefined();
    expect(captured.consentLogs).toBeUndefined();
  });
});

describe('전화번호로 소셜 계정 잇기', () => {
  it('같은 전화번호를 쓰는 회원이 있으면 새 회원 대신 그 회원에 계정을 연결한다', async () => {
    // 카카오로 가입한 사람이 네이버로 로그인한 상황.
    const { service, captured } = makeService(null, [{ id: 'user-kakao' }]);

    const result = await service.resolveOAuthLogin({
      ...baseProfile,
      provider: AuthProvider.NAVER,
      providerId: 'naver-1',
      refreshToken: 'naver-refresh',
    });

    expect(result.userId).toBe('user-kakao');
    // 회원을 또 만들면 아이 기록이 두 계정으로 쪼개진다.
    expect(captured.user).toBeUndefined();
    expect(captured.linkedAccount).toMatchObject({
      userId: 'user-kakao',
      provider: AuthProvider.NAVER,
      providerId: 'naver-1',
      refreshToken: 'naver-refresh',
    });
    // 새로 연결한 제공자가 준 정보로 회원 정보도 갱신한다.
    expect(captured.syncedUserId).toBe('user-kakao');
  });

  it('번호가 같은 회원이 둘 이상이면 가장 먼저 가입한 쪽에 붙인다', async () => {
    const { service, captured } = makeService(null, [
      { id: 'user-old' },
      { id: 'user-new' },
    ]);

    const result = await service.resolveOAuthLogin({
      ...baseProfile,
      provider: AuthProvider.NAVER,
      providerId: 'naver-2',
    });

    expect(result.userId).toBe('user-old');
    expect(captured.linkedAccount).toMatchObject({ userId: 'user-old' });
  });

  it('전화번호를 주지 않는 애플은 연결 대상이 없어 새 회원이 된다', async () => {
    // 애플은 전화번호를 주지 않는다. 이을 열쇠가 없으므로 별도 회원이 된다.
    const { service, captured } = makeService(null, [{ id: 'user-kakao' }]);

    await service.resolveOAuthLogin({
      provider: AuthProvider.APPLE,
      providerId: 'apple-1',
      name: '김아기',
      phone: undefined,
    });

    expect(captured.linkedAccount).toBeUndefined();
    expect(captured.user?.name).toBe('김아기');
    expect(captured.user?.phone).toBeNull();
  });

  it('번호가 같은 회원이 없으면 평소대로 새 회원을 만든다', async () => {
    const { service, captured } = makeService(null, []);

    await service.resolveOAuthLogin({
      ...baseProfile,
      consents: { terms: true, privacy: true },
    });

    expect(captured.linkedAccount).toBeUndefined();
    expect(captured.user?.phone).toBe('01012345678');
  });
});
