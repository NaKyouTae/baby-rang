import {
  BadRequestException,
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AgeGroup,
  AuthProvider,
  ConsentType,
  GrowthRecordType,
  Prisma,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NaverService } from './naver.service';
import { SCALE, getQuestions } from '../temperament/data/questions';
import {
  buildFreeContentByType,
  buildPaidContent,
  buildSummary,
  checkReliability,
  computeScores,
  determineType,
} from '../temperament/scoring';
import { RESULT_ACCESS_DAYS } from '../temperament/temperament.service';

export type ConsentInput = {
  terms?: boolean;
  privacy?: boolean;
  marketing?: boolean;
  thirdParty?: boolean;
};

const CONSENT_TYPE: Record<keyof ConsentInput, ConsentType> = {
  terms: ConsentType.TERMS,
  privacy: ConsentType.PRIVACY,
  marketing: ConsentType.MARKETING,
  thirdParty: ConsentType.THIRD_PARTY,
};

// 마케팅 동의 유효기간 (개인정보보호법 시행령 §48조의2 — 2년 재확인 권장).
const MARKETING_CONSENT_VALIDITY_YEARS = 2;

function calcMarketingExpiresAt(agreedAt: Date): Date {
  const expires = new Date(agreedAt);
  expires.setFullYear(expires.getFullYear() + MARKETING_CONSENT_VALIDITY_YEARS);
  return expires;
}

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  /** 실명. 카카오·네이버 필수 동의항목. */
  name?: string;
  /** 01012345678 형태. 카카오·네이버 필수 동의항목. */
  phone?: string;
  /** 'male' | 'female'. 선택 동의항목이라 비어 있을 수 있다. */
  gender?: string;
  /** '20-29' 형태. 선택 동의항목이라 비어 있을 수 있다. */
  ageRange?: string;
  email?: string;
  profileImage?: string;
  /**
   * 소셜 동의 화면에서 이미 받은 약관 동의.
   *
   * 카카오 간편가입(카카오싱크)만 내려준다. 네이버에는 약관 동의 기능이 없어
   * 항상 비어 있고, 그때는 앱의 약관 화면에서 직접 받아야 한다.
   */
  consents?: ConsentInput;
  /** 네이버 연동해제용. 로그인할 때마다 최신 값으로 갱신한다. */
  refreshToken?: string;
}

/** 로그인 결과. 신규·기존 구분 없이 항상 user 가 존재한다. */
export type OAuthResult = { userId: string };

// 이름·전화번호를 필수 동의항목으로 받는 제공자.
//
// 애플은 전화번호를 주지 않는다(이름도 최초 1회뿐). 애플 로그인은 App Store
// 심사 지침 4.8 때문에 반드시 유지해야 하므로, 같은 기준을 적용하면 애플로는
// 가입 자체가 불가능해진다. 그래서 필수 검사는 이 두 곳에만 건다.
const PROVIDERS_REQUIRING_PHONE: AuthProvider[] = [
  AuthProvider.KAKAO,
  AuthProvider.NAVER,
];

export function requiresPhone(provider: AuthProvider): boolean {
  return PROVIDERS_REQUIRING_PHONE.includes(provider);
}

// 토스페이먼츠 카드사 심사관용 테스트 계정. 카카오 외 로그인 경로가 없어서 심사 진행이 막히는 경우에만 사용.
// 심사 종료 후 제거 예정.
const TEST_LOGIN_USERNAME = 'toss-review';
const TEST_LOGIN_PASSWORD = 'BabyRang2026!';
const TEST_ACCOUNT_PROVIDER_ID = 'test-toss-review';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private naverService: NaverService,
  ) {}

  // 소셜 로그인 결과 분기:
  // - 이미 회원가입을 끝낸 user → existing (정식 access_token 발급)
  // - 미온보딩(과거 흐름 잔재) 또는 신규 → pending (DB 미생성, signup_token 발급)
  // 사용자가 "회원가입" 버튼을 누르기 전에는 user 레코드를 만들지 않음.
  /**
   * 소셜 로그인 결과를 user 로 바꾼다. 신규면 이 자리에서 가입까지 끝낸다.
   *
   * 예전에는 로그인과 가입을 나눠 signup_token 을 발급하고 가입 화면에서 추가 정보를
   * 받았지만, 받을 정보가 모두 소셜 동의항목으로 들어오게 되면서 그 화면이 할 일이
   * 없어졌다. 지금은 "로그인 = 가입"이고, 사용자는 동의 화면만 거친다.
   */
  async resolveOAuthLogin(profile: OAuthProfile): Promise<OAuthResult> {
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (existingAccount) {
      // 로그인할 때마다 소셜이 준 값으로 회원 정보를 맞춘다.
      // 이름·전화번호 동의항목을 뒤늦게 추가했기 때문에, 이미 가입한 회원은
      // 이 경로(추가 정보 화면 → 재로그인)로만 빈 칸을 채울 수 있다.
      await this.syncSocialProfile(existingAccount.userId, profile);
      if (profile.refreshToken) {
        await this.prisma.account.update({
          where: { id: existingAccount.id },
          data: { refreshToken: profile.refreshToken },
        });
      }
      return { userId: existingAccount.userId };
    }

    // 처음 보는 소셜 계정이지만, 같은 전화번호를 가진 회원이 이미 있으면
    // 새 회원을 만들지 않고 그 회원에 이 소셜 계정을 덧붙인다.
    const linked = await this.linkToUserByPhone(profile);
    if (linked) return { userId: linked };

    return { userId: await this.createUserFromSocial(profile) };
  }

  /**
   * 전화번호가 같은 기존 회원에 소셜 계정을 연결한다. 없으면 null.
   *
   * 카카오·네이버가 주는 전화번호는 각 서비스가 본인확인을 마친 값이라,
   * 같은 번호면 같은 사람으로 본다. 이게 없으면 한 사람이 카카오로 한 번,
   * 네이버로 한 번 가입해 아이 기록이 두 계정으로 쪼개진다.
   *
   * ⚠️ 애플은 전화번호를 주지 않아 이 경로를 탈 수 없다. 애플로 먼저 가입한
   *    사람이 나중에 카카오로 로그인하면 별도 회원이 된다(합칠 방법이 없다).
   */
  private async linkToUserByPhone(
    profile: OAuthProfile,
  ): Promise<string | null> {
    if (!profile.phone) return null;

    // 번호가 같은 회원이 둘 이상이면 가장 먼저 가입한 쪽에 붙인다.
    // 통신사 번호 재사용 등으로 생길 수 있는 상황이라 조용히 넘기지 않고 남긴다.
    const owners = await this.prisma.user.findMany({
      where: { phone: profile.phone },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      take: 2,
    });
    if (owners.length === 0) return null;
    if (owners.length > 1) {
      this.logger.warn(
        `같은 전화번호를 쓰는 회원이 둘 이상이다. 가장 먼저 가입한 회원에 연결한다. userId=${owners[0].id}`,
      );
    }

    const userId = owners[0].id;
    await this.prisma.account.create({
      data: {
        userId,
        provider: profile.provider,
        providerId: profile.providerId,
        refreshToken: profile.refreshToken ?? null,
      },
    });
    // 새로 연결한 제공자가 더 많은 정보를 줄 수 있다(성별·연령대 등).
    await this.syncSocialProfile(userId, profile);

    this.logger.log(
      `전화번호가 같아 기존 회원에 ${profile.provider} 계정을 연결했다. userId=${userId}`,
    );
    return userId;
  }

  /**
   * 소셜 프로필만으로 회원을 만든다.
   *
   * 약관 동의는 소셜 쪽에서 받는다 —
   *   · 카카오: 간편가입 동의 화면에서 받은 내역을 그대로 가져온다(kakao-terms.service.ts)
   *   · 네이버: 약관 동의 기능이 없다. 로그인 화면에 띄운 고지("계속하면 이용약관·
   *     개인정보처리방침에 동의하게 됩니다")가 동의의 근거다.
   * 그래서 필수 약관(terms·privacy)은 가입 시각으로 기록하고, 선택 약관은
   * 소셜에서 받은 값이 있을 때만 동의로 남긴다(기본은 미동의).
   */
  private async createUserFromSocial(profile: OAuthProfile): Promise<string> {
    // 이름·전화번호는 사용자가 입력할 수 없고 소셜 동의항목으로만 들어온다.
    // 비어 있다면 동의 화면에서 그 항목을 건너뛴 것이라 가입을 진행할 수 없다.
    if (requiresPhone(profile.provider) && (!profile.name || !profile.phone)) {
      throw new BadRequestException({
        code: 'SOCIAL_CONSENT_REQUIRED',
        missing: [
          ...(profile.name ? [] : ['name']),
          ...(profile.phone ? [] : ['phone']),
        ],
        message: '이름과 전화번호 제공에 동의해야 가입할 수 있어요.',
      });
    }

    const consents: ConsentInput = {
      terms: true,
      privacy: true,
      marketing: !!profile.consents?.marketing,
      thirdParty: !!profile.consents?.thirdParty,
    };
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: profile.email,
          profileImage: profile.profileImage,
          name: profile.name ?? null,
          phone: profile.phone ?? null,
          gender: profile.gender ?? null,
          ageRange: profile.ageRange ?? null,
          onboardedAt: now,
          termsAgreedAt: now,
          privacyAgreedAt: now,
          marketingAgreedAt: consents.marketing ? now : null,
          marketingExpiresAt: consents.marketing
            ? calcMarketingExpiresAt(now)
            : null,
          thirdPartyAgreedAt: consents.thirdParty ? now : null,
          accounts: {
            create: {
              provider: profile.provider,
              providerId: profile.providerId,
              refreshToken: profile.refreshToken ?? null,
            },
          },
        },
      });

      // 1인 그룹 자동 생성 — 본인이 owner.
      // 공유는 이 그룹에 다른 사람을 초대하는 것이고, 다른 그룹 합류는 별도 group_members 추가.
      await tx.group.create({
        data: {
          ownerId: user.id,
          code: await this.generateUniqueGroupCode(tx),
          members: { create: { userId: user.id } },
        },
      });

      await tx.consentLog.createMany({
        data: (['terms', 'privacy', 'marketing', 'thirdParty'] as const).map(
          (key) => ({
            userId: user.id,
            type: CONSENT_TYPE[key],
            agreed: !!consents[key],
            occurredAt: now,
          }),
        ),
      });
      return user;
    });

    return created.id;
  }

  generateToken(userId: string) {
    return {
      accessToken: this.jwtService.sign({ sub: userId }),
    };
  }

  // 홈 화면 위젯 전용 장수명 토큰.
  // 위젯은 앱과 별개 프로세스라 httpOnly 쿠키에 접근할 수 없으므로,
  // 앱이 이 토큰을 네이티브(App Group / SharedPreferences)에 저장해두고
  // 위젯이 백그라운드에서 직접 API를 호출할 때 Bearer로 사용한다.
  // type:'widget'으로 표시해 일반 세션 토큰과 구분(향후 스코프 제한 여지).
  generateWidgetToken(userId: string) {
    return {
      widgetToken: this.jwtService.sign(
        { sub: userId, type: 'widget' },
        { expiresIn: '365d' },
      ),
    };
  }

  /**
   * 네이버 웹 로그인용 state. CSRF 방지로 쓰인다.
   *
   * 세션 저장소가 없으므로 서버에 보관하지 않고 JWT 로 서명해 왕복시킨다.
   * 콜백에서 서명이 맞고 만료되지 않았다면 우리가 시작시킨 로그인이 맞다.
   */
  generateOAuthState(): string {
    return this.jwtService.sign(
      { type: 'oauth_state', nonce: randomUUID() },
      { expiresIn: '10m' },
    );
  }

  verifyOAuthState(state?: string): void {
    try {
      const payload = this.jwtService.verify<{ type?: string }>(state ?? '');
      if (payload?.type !== 'oauth_state') throw new Error('type mismatch');
    } catch {
      throw new BadRequestException('invalid oauth state');
    }
  }

  // 카드사 심사관용 테스트 로그인. 하드코딩된 자격증명을 검증하고, 미리 만들어둔 테스트 user가 없으면 생성한다.
  async testLogin(username: string, password: string) {
    if (username !== TEST_LOGIN_USERNAME || password !== TEST_LOGIN_PASSWORD) {
      throw new BadRequestException('invalid credentials');
    }

    const existing = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: AuthProvider.KAKAO,
          providerId: TEST_ACCOUNT_PROVIDER_ID,
        },
      },
    });

    let userId = existing?.userId;

    if (!userId) {
      const now = new Date();
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: '테스트 계정',
            phone: '01000000000',
            parentRole: 'mom',
            onboardedAt: now,
            termsAgreedAt: now,
            privacyAgreedAt: now,
            accounts: {
              create: {
                provider: AuthProvider.KAKAO,
                providerId: TEST_ACCOUNT_PROVIDER_ID,
              },
            },
          },
        });

        await tx.group.create({
          data: {
            ownerId: created.id,
            code: await this.generateUniqueGroupCode(tx),
            members: { create: { userId: created.id } },
          },
        });

        return created;
      });
      userId = user.id;
    }

    await this.ensureDemoData(userId);

    return { accessToken: this.jwtService.sign({ sub: userId }) };
  }

  /**
   * 심사관용 데모 데이터를 보장한다. 로그인할 때마다 호출되며 멱등하다.
   *
   * 왜 필요한가:
   * 스토어 심사관은 계정을 직접 만들거나 유료 콘텐츠를 구매할 수 없다(Google Play 정책).
   * 빈 계정을 주면 아이 등록부터 검사 20문항까지 직접 해야 하고, 그래도 상세 리포트는
   * 볼 수 없다. 그래서 아이·기록·해제된 리포트를 미리 채워 둔다.
   *
   * 검사 결과는 완료 후 RESULT_ACCESS_DAYS 일이 지나면 열람이 막히므로(410),
   * 만료됐으면 로그인 시점에 새 검사를 만들어 항상 볼 수 있는 상태로 유지한다.
   */
  private async ensureDemoData(userId: string) {
    const now = new Date();

    const group =
      (await this.prisma.group.findFirst({ where: { ownerId: userId } })) ??
      (await this.prisma.group.create({
        data: {
          ownerId: userId,
          code: await this.generateUniqueGroupCode(this.prisma),
          members: { create: { userId } },
        },
      }));

    let child = await this.prisma.child.findFirst({
      where: { groupId: group.id },
    });

    if (!child) {
      const birthDate = new Date(now);
      birthDate.setMonth(birthDate.getMonth() - 6);

      child = await this.prisma.child.create({
        data: { groupId: group.id, name: '아기', gender: 'female', birthDate },
      });

      // 홈·기록 화면이 비어 보이지 않도록 최근 기록 몇 건을 함께 넣는다.
      const hoursAgo = (h: number) =>
        new Date(now.getTime() - h * 60 * 60 * 1000);
      await this.prisma.growthRecord.createMany({
        data: [
          {
            userId,
            childId: child.id,
            type: GrowthRecordType.BREASTFEEDING,
            startAt: hoursAgo(2),
          },
          {
            userId,
            childId: child.id,
            type: GrowthRecordType.DIAPER,
            startAt: hoursAgo(4),
          },
          {
            userId,
            childId: child.id,
            type: GrowthRecordType.BABY_FOOD,
            startAt: hoursAgo(6),
          },
          {
            userId,
            childId: child.id,
            type: GrowthRecordType.SLEEP,
            startAt: hoursAgo(11),
            endAt: hoursAgo(9),
          },
        ],
      });
    }

    // 아직 열람 가능한 유료 리포트가 있으면 그대로 둔다.
    const accessibleSince = new Date(
      now.getTime() - RESULT_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    );
    const alive = await this.prisma.temperamentSubmission.findFirst({
      where: {
        userId,
        status: SubmissionStatus.COMPLETED,
        completedAt: { gt: accessibleSince },
        result: { isPaid: true },
      },
    });
    if (alive) return;

    // 실제 채점 파이프라인을 그대로 태워 유효한 결과를 만든다.
    // (임의 값을 넣으면 화면이 깨지거나 신뢰도 경고가 뜬다)
    const ageGroup = AgeGroup.before_first;
    const answers = getQuestions(ageGroup).map((q, i) => ({
      questionId: q.id,
      questionNo: q.questionNo,
      dimension: q.dimension,
      // 활동성만 최고점을 주어 '균형성장형'이 아닌 뚜렷한 유형이 나오게 한다.
      score: q.dimension === 'activity' ? SCALE.max : 3 + (i % 2),
    }));

    const scores = computeScores(answers);
    const typeInfo = determineType(scores);
    const reliability = checkReliability(answers);

    await this.prisma.temperamentSubmission.create({
      data: {
        userId,
        ageGroup,
        childAge: 6,
        status: SubmissionStatus.COMPLETED,
        completedAt: now,
        answers: {
          createMany: {
            data: answers.map((a) => ({
              questionId: a.questionId,
              questionNo: a.questionNo,
              dimension: a.dimension,
              score: a.score,
            })),
          },
        },
        result: {
          create: {
            primaryType: typeInfo.primaryType,
            primaryTypeLabel: typeInfo.primaryTypeLabel,
            emotionModifier: typeInfo.emotionModifier,
            isReliable: reliability.isReliable,
            reliabilityMsg: reliability.reliabilityMsg,
            scores: scores as unknown as Prisma.InputJsonValue,
            summary: buildSummary(
              typeInfo.primaryType,
              typeInfo.primaryTypeLabel,
              typeInfo.emotionModifier,
            ) as unknown as Prisma.InputJsonValue,
            freeContent: buildFreeContentByType(
              typeInfo.primaryType,
            ) as unknown as Prisma.InputJsonValue,
            paidContent: buildPaidContent(
              scores,
              typeInfo.primaryType,
            ) as unknown as Prisma.InputJsonValue,
            // 심사관은 직접 구매할 수 없으므로 상세 리포트를 열어둔 상태로 만든다.
            isPaid: true,
            unlockedAt: now,
          },
        },
      },
    });
  }

  /**
   * 소셜이 준 값으로 회원 정보를 덮어쓴다.
   *
   * 값이 있는 항목만 반영한다. 사용자가 카카오에서 선택 동의(성별·연령대)를
   * 철회하면 그 항목이 응답에서 빠지는데, 그때 null 로 지워버리면 "동의를 유지한
   * 다른 로그인 경로"에서 받은 값까지 사라진다. 지우는 것은 회원탈퇴로만 한다.
   */
  private async syncSocialProfile(userId: string, profile: OAuthProfile) {
    const data: Prisma.UserUpdateInput = {};
    if (profile.name) data.name = profile.name;
    if (profile.phone) data.phone = profile.phone;
    if (profile.gender) data.gender = profile.gender;
    if (profile.ageRange) data.ageRange = profile.ageRange;
    if (profile.email) data.email = profile.email;
    if (profile.profileImage) data.profileImage = profile.profileImage;
    if (Object.keys(data).length === 0) return;

    await this.prisma.user.update({ where: { id: userId }, data });
  }

  /**
   * 내 정보 + 추가 정보가 필요한지 여부.
   *
   * needsAdditionalInfo 는 "이름·전화번호 동의항목을 도입하기 전에 가입한 회원"을
   * 가려낸다. 클라이언트가 직접 판단하지 않고 서버가 내려주는 이유는, 애플 로그인
   * 전용 회원처럼 전화번호를 받을 수 없는 예외를 한 곳에서만 다루기 위해서다.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { select: { provider: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const { accounts, ...rest } = user;
    const canReceivePhone = accounts.some((a) => requiresPhone(a.provider));
    return {
      ...rest,
      providers: accounts.map((a) => a.provider),
      needsAdditionalInfo:
        !!user.onboardedAt && canReceivePhone && (!user.name || !user.phone),
    };
  }

  // 이름·전화번호·성별·연령대는 여기서 바꿀 수 없다.
  // 소셜 동의항목으로만 들어오는 값이라, 앱에서 고치면 소셜 쪽과 어긋난 채
  // 다음 로그인 때 다시 덮어써진다(syncSocialProfile). 바꾸려면 소셜에서 바꿔야 한다.
  async updateProfile(userId: string, dto: { parentRole?: string }) {
    const data: Prisma.UserUpdateInput = {};
    if (typeof dto.parentRole === 'string') {
      const valid = [
        'mom',
        'dad',
        'grandmother',
        'grandfather',
        'caregiver',
        'other',
      ];
      if (!valid.includes(dto.parentRole)) {
        throw new BadRequestException('invalid parentRole');
      }
      data.parentRole = dto.parentRole;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no profile fields to update');
    }
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async getConsents(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        termsAgreedAt: true,
        privacyAgreedAt: true,
        marketingAgreedAt: true,
        marketingExpiresAt: true,
        thirdPartyAgreedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    // 마케팅 동의가 만료되었으면 agreed=false로 노출 (실효성 없는 동의를 살아있다고 보여주지 않음).
    const marketingExpired =
      !!user.marketingExpiresAt && user.marketingExpiresAt < new Date();
    return {
      terms: { agreed: !!user.termsAgreedAt, agreedAt: user.termsAgreedAt },
      privacy: {
        agreed: !!user.privacyAgreedAt,
        agreedAt: user.privacyAgreedAt,
      },
      marketing: {
        agreed: !!user.marketingAgreedAt && !marketingExpired,
        agreedAt: user.marketingAgreedAt,
        expiresAt: user.marketingExpiresAt,
        expired: marketingExpired,
      },
      thirdParty: {
        agreed: !!user.thirdPartyAgreedAt,
        agreedAt: user.thirdPartyAgreedAt,
      },
    };
  }

  // 선택 동의(마케팅, 제3자 제공)만 변경 가능. 필수 동의 철회는 회원탈퇴로만.
  async updateConsents(
    userId: string,
    dto: Pick<ConsentInput, 'marketing' | 'thirdParty'>,
  ) {
    const now = new Date();
    const data: Prisma.UserUpdateInput = {};
    const logs: Prisma.ConsentLogCreateManyInput[] = [];

    if (typeof dto.marketing === 'boolean') {
      data.marketingAgreedAt = dto.marketing ? now : null;
      data.marketingExpiresAt = dto.marketing
        ? calcMarketingExpiresAt(now)
        : null;
      logs.push({
        userId,
        type: ConsentType.MARKETING,
        agreed: dto.marketing,
        occurredAt: now,
      });
    }
    if (typeof dto.thirdParty === 'boolean') {
      data.thirdPartyAgreedAt = dto.thirdParty ? now : null;
      logs.push({
        userId,
        type: ConsentType.THIRD_PARTY,
        agreed: dto.thirdParty,
        occurredAt: now,
      });
    }

    if (logs.length === 0) {
      throw new BadRequestException('no consent fields to update');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });
      await tx.consentLog.createMany({ data: logs });
    });

    return this.getConsents(userId);
  }

  // 6자리 가독성 높은 그룹 코드 생성 (I/O/0/1 제외). 중복이면 재시도.
  private async generateUniqueGroupCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generate = () => {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      return code;
    };
    for (let i = 0; i < 10; i++) {
      const code = generate();
      const dup = await tx.group.findUnique({ where: { code } });
      if (!dup) return code;
    }
    throw new InternalServerErrorException('failed to generate group code');
  }

  async withdraw(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 소셜 unlink는 카카오만 — 외부 호출은 트랜잭션 밖에서 먼저 처리.
    const kakaoAccount = user.accounts.find(
      (a) => a.provider === AuthProvider.KAKAO,
    );
    if (kakaoAccount) {
      const adminKey = this.configService.get<string>('KAKAO_ADMIN_KEY');
      if (!adminKey) {
        throw new InternalServerErrorException(
          'KAKAO_ADMIN_KEY is not configured',
        );
      }

      const body = new URLSearchParams({
        target_id_type: 'user_id',
        target_id: kakaoAccount.providerId,
      });

      const res = await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: {
          Authorization: `KakaoAK ${adminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new InternalServerErrorException(`Kakao unlink failed: ${text}`);
      }
    }

    // 네이버 연동해제. 저장해 둔 refresh token 으로만 가능하고, 실패해도 탈퇴는 계속한다.
    // (카카오처럼 서버가 admin key 로 단독 해제하는 수단이 네이버에는 없다 —
    //  토큰이 만료됐다고 탈퇴를 막으면 사용자가 계정에서 빠져나갈 수 없다)
    const naverAccount = user.accounts.find(
      (a) => a.provider === AuthProvider.NAVER,
    );
    if (naverAccount?.refreshToken) {
      await this.naverService.unlink(naverAccount.refreshToken);
    }

    // 그룹 정리:
    // - 본인이 owner인 그룹마다: 다른 멤버 있으면 가장 일찍 합류한 멤버에게 자동 이양
    //                            없으면 그룹 삭제(아이/기록 cascade)
    // - 본인이 일반 멤버인 그룹: group_members에서 본인만 빠짐 (FK cascade로 자동)
    await this.prisma.$transaction(async (tx) => {
      const ownedGroups = await tx.group.findMany({
        where: { ownerId: userId },
        include: {
          members: {
            where: { userId: { not: userId } },
            orderBy: { joinedAt: 'asc' },
            take: 1,
          },
        },
      });

      for (const group of ownedGroups) {
        const successor = group.members[0];
        if (successor) {
          // 자동 이양: 가장 일찍 합류한 멤버가 새 owner.
          await tx.group.update({
            where: { id: group.id },
            data: { ownerId: successor.userId },
          });
        } else {
          // 마지막 멤버 → 그룹·아이·기록 모두 cascade 삭제.
          await tx.group.delete({ where: { id: group.id } });
        }
      }

      // user 삭제 → 본인 navSlots/payments/consents/temperament 등 cascade 삭제 +
      //             group_members에서 본인 행 cascade 삭제 +
      //             growth_records/physical_growths의 userId는 SetNull(기록 자체는 보존).
      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true };
  }
}
