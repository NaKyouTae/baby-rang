import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
  nickname?: string;
  email?: string;
  profileImage?: string;
}

export type OAuthResult =
  | { kind: 'existing'; userId: string }
  | { kind: 'pending'; profile: OAuthProfile };

export interface SignupTokenPayload {
  type: 'signup';
  provider: AuthProvider;
  providerId: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
}

// signup_token 만료. 사용자가 약관 읽고 정보 입력하는 시간을 고려해 30분.
const SIGNUP_TOKEN_TTL = '30m';

// 토스페이먼츠 카드사 심사관용 테스트 계정. 카카오 외 로그인 경로가 없어서 심사 진행이 막히는 경우에만 사용.
// 심사 종료 후 제거 예정.
const TEST_LOGIN_USERNAME = 'toss-review';
const TEST_LOGIN_PASSWORD = 'BabyRang2026!';
const TEST_ACCOUNT_PROVIDER_ID = 'test-toss-review';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 소셜 로그인 결과 분기:
  // - 이미 회원가입을 끝낸 user → existing (정식 access_token 발급)
  // - 미온보딩(과거 흐름 잔재) 또는 신규 → pending (DB 미생성, signup_token 발급)
  // 사용자가 "회원가입" 버튼을 누르기 전에는 user 레코드를 만들지 않음.
  async resolveOAuthLogin(profile: OAuthProfile): Promise<OAuthResult> {
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    if (existingAccount && existingAccount.user.onboardedAt) {
      return { kind: 'existing', userId: existingAccount.userId };
    }

    // 이전 흐름에서 만들어진 미온보딩 user는 정리 — 회원가입 미완료 상태를 DB에 남겨두지 않음.
    // user를 지우면 account는 onDelete: Cascade로 같이 제거됨.
    if (existingAccount) {
      await this.prisma.user.delete({ where: { id: existingAccount.userId } });
    }

    return { kind: 'pending', profile };
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

  generateSignupToken(profile: OAuthProfile): string {
    const payload: SignupTokenPayload = {
      type: 'signup',
      provider: profile.provider,
      providerId: profile.providerId,
      nickname: profile.nickname,
      email: profile.email,
      profileImage: profile.profileImage,
    };
    return this.jwtService.sign(payload, { expiresIn: SIGNUP_TOKEN_TTL });
  }

  verifySignupToken(token: string): SignupTokenPayload {
    let payload: SignupTokenPayload;
    try {
      payload = this.jwtService.verify<SignupTokenPayload>(token);
    } catch {
      throw new BadRequestException('invalid or expired signup token');
    }
    if (
      payload?.type !== 'signup' ||
      !payload.provider ||
      !payload.providerId
    ) {
      throw new BadRequestException('invalid signup token');
    }
    return payload;
  }

  // 회원가입(신규): signup_token 검증 → user 생성 → 정식 access_token 발급.
  // user 레코드는 이 시점에 최초로 생성됨 (카카오 로그인 시점에는 만들지 않음).
  async signup(
    signupToken: string,
    dto: {
      nickname: string;
      parentRole: string;
      birthYear?: number | null;
      consents?: ConsentInput;
      children?: Array<{
        name: string;
        gender: string;
        birthDate: string;
        dueDate?: string;
      }>;
    },
  ) {
    const profile = this.verifySignupToken(signupToken);

    const nickname = dto.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('nickname is required');
    }
    const validRoles = [
      'mom',
      'dad',
      'grandmother',
      'grandfather',
      'caregiver',
      'other',
    ];
    if (!validRoles.includes(dto.parentRole)) {
      throw new BadRequestException('invalid parentRole');
    }

    // 필수 동의(이용약관, 개인정보 수집·이용) 검증.
    // UI 신뢰만으로 충분하지 않은 이유: 회원가입은 법적 효력이 있는 동의 행위로,
    // 클라이언트 변조/오류로 동의 없이 가입되는 경로를 서버에서 차단해야 함.
    const consents: ConsentInput = dto.consents ?? {};
    if (!consents.terms || !consents.privacy) {
      throw new BadRequestException('required consents missing');
    }

    const childrenData = (dto.children ?? [])
      .filter((c) => c && c.name && c.gender && c.birthDate)
      .map((c) => ({
        name: c.name.trim(),
        gender: c.gender,
        birthDate: new Date(`${c.birthDate.slice(0, 10)}T12:00:00.000Z`),
        dueDate: c.dueDate
          ? new Date(`${c.dueDate.slice(0, 10)}T12:00:00.000Z`)
          : null,
      }));

    const now = new Date();

    // 중복 가입 방어: signup_token 발급 후 다른 탭에서 이미 회원가입을 끝냈을 수도 있음.
    const duplicate = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });
    if (duplicate) {
      throw new BadRequestException('already signed up');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: profile.email,
          profileImage: profile.profileImage,
          nickname,
          parentRole: dto.parentRole,
          birthYear: dto.birthYear ?? null,
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
            },
          },
        },
      });

      // 1인 그룹 자동 생성 — 본인이 owner.
      // 공유는 이 그룹에 다른 사람을 초대하는 것이고, 다른 그룹 합류는 별도 group_members 추가.
      const group = await tx.group.create({
        data: {
          ownerId: user.id,
          code: await this.generateUniqueGroupCode(tx),
          members: { create: { userId: user.id } },
        },
      });

      if (childrenData.length > 0) {
        await tx.child.createMany({
          data: childrenData.map((c) => ({ ...c, groupId: group.id })),
        });
      }
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

    return {
      accessToken: this.jwtService.sign({ sub: created.id }),
      user: created,
    };
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
            nickname: '테스트 계정',
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

  async updateProfile(
    userId: string,
    dto: { nickname?: string; parentRole?: string; birthYear?: number | null },
  ) {
    const data: Prisma.UserUpdateInput = {};
    if (typeof dto.nickname === 'string') {
      const nickname = dto.nickname.trim();
      if (!nickname) throw new BadRequestException('nickname is required');
      data.nickname = nickname;
    }
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
    if (dto.birthYear !== undefined) {
      data.birthYear = dto.birthYear;
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
