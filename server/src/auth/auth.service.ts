import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConsentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

interface KakaoProfile {
  kakaoId: string;
  nickname?: string;
  email?: string;
  profileImage?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateKakaoUser(profile: KakaoProfile) {
    let user = await this.prisma.user.findUnique({
      where: { kakaoId: profile.kakaoId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kakaoId: profile.kakaoId,
          nickname: profile.nickname,
          email: profile.email,
          profileImage: profile.profileImage,
        },
      });
    }

    return user;
  }

  generateToken(userId: string) {
    return {
      accessToken: this.jwtService.sign({ sub: userId }),
    };
  }

  async completeOnboarding(
    userId: string,
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
    const nickname = dto.nickname?.trim();
    if (!nickname) {
      throw new InternalServerErrorException('nickname is required');
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
      throw new InternalServerErrorException('invalid parentRole');
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

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
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
        },
      });
      if (childrenData.length > 0) {
        await tx.child.createMany({
          data: childrenData.map((c) => ({ ...c, userId })),
        });
      }
      await tx.consentLog.createMany({
        data: (['terms', 'privacy', 'marketing', 'thirdParty'] as const).map(
          (key) => ({
            userId,
            type: CONSENT_TYPE[key],
            agreed: !!consents[key],
            occurredAt: now,
          }),
        ),
      });
    });

    return this.prisma.user.findUnique({ where: { id: userId } });
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

  async withdraw(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const adminKey = this.configService.get<string>('KAKAO_ADMIN_KEY');
    if (!adminKey) {
      throw new InternalServerErrorException(
        'KAKAO_ADMIN_KEY is not configured',
      );
    }

    const body = new URLSearchParams({
      target_id_type: 'user_id',
      target_id: user.kakaoId,
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

    await this.prisma.user.delete({ where: { id: userId } });

    return { success: true };
  }
}
