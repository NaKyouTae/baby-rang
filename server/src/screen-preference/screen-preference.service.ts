import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 초기 화면으로 선택 가능한 값. 'home'은 기본값(홈)을 의미하며 DB엔 null로 저장한다.
const ALLOWED_TARGETS = new Set([
  'home',
  'growth-record',
  'growth-pattern',
  'nursing-room',
  'physical-growth',
  'wonder-weeks',
  'sleep-golden-time',
  'air-quality',
]);

export type ScreenPreference = {
  home: string;
};

@Injectable()
export class ScreenPreferenceService {
  constructor(private prisma: PrismaService) {}

  async find(userId: string): Promise<ScreenPreference> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { homeMenu: true },
    });
    // null(미설정) → 'home' 기본값으로 정규화해서 반환.
    return { home: user?.homeMenu ?? 'home' };
  }

  // 'home' 또는 미지정은 null(기본값)로 저장한다.
  private normalize(value: unknown): string | null {
    if (value === null || value === undefined || value === 'home') return null;
    if (typeof value !== 'string' || !ALLOWED_TARGETS.has(value)) {
      throw new BadRequestException(`invalid home: ${JSON.stringify(value)}`);
    }
    return value;
  }

  async update(
    userId: string,
    body: { home?: unknown },
  ): Promise<ScreenPreference> {
    const homeMenu = this.normalize(body.home);

    await this.prisma.user.update({
      where: { id: userId },
      data: { homeMenu },
    });

    return this.find(userId);
  }
}
