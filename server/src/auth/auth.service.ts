import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
}
