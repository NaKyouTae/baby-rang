import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

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
      children?: Array<{ name: string; gender: string; birthDate: string }>;
    },
  ) {
    const nickname = dto.nickname?.trim();
    if (!nickname) {
      throw new InternalServerErrorException('nickname is required');
    }
    if (dto.parentRole !== 'mom' && dto.parentRole !== 'dad') {
      throw new InternalServerErrorException('invalid parentRole');
    }

    const childrenData = (dto.children ?? [])
      .filter((c) => c && c.name && c.gender && c.birthDate)
      .map((c) => ({
        name: c.name.trim(),
        gender: c.gender,
        birthDate: new Date(`${c.birthDate.slice(0, 10)}T12:00:00.000Z`),
      }));

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          nickname,
          parentRole: dto.parentRole,
          birthYear: dto.birthYear ?? null,
          onboardedAt: new Date(),
        },
      });
      if (childrenData.length > 0) {
        await tx.child.createMany({
          data: childrenData.map((c) => ({ ...c, userId })),
        });
      }
    });

    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async withdraw(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const adminKey = this.configService.get<string>('KAKAO_ADMIN_KEY');
    if (!adminKey) {
      throw new InternalServerErrorException('KAKAO_ADMIN_KEY is not configured');
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
