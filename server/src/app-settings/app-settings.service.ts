import { BadRequestException, Injectable } from '@nestjs/common';
import { AppAdNetwork } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// 설정은 id=1 한 행만 쓴다.
const SETTINGS_ID = 1;

// 행이 없을 때(마이그레이션 직후 시드 누락 등)에도 앱이 광고를 고를 수 있게 기본값을 둔다.
// AdMob 계정 정지(2026-10-15) 중이라 KAKAO.
const DEFAULT_AD_NETWORK: AppAdNetwork = AppAdNetwork.KAKAO;

@Injectable()
export class AppSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<{ adNetwork: AppAdNetwork }> {
    const row = await this.prisma.appSetting.findUnique({
      where: { id: SETTINGS_ID },
    });
    return { adNetwork: row?.adNetwork ?? DEFAULT_AD_NETWORK };
  }

  async setAdNetwork(value: unknown): Promise<{ adNetwork: AppAdNetwork }> {
    // 오타 등으로 이상한 값이 들어가면 앱이 광고를 못 띄우므로 enum 값만 받는다.
    if (
      typeof value !== 'string' ||
      !(Object.values(AppAdNetwork) as string[]).includes(value)
    ) {
      throw new BadRequestException(
        'adNetwork 는 GOOGLE 또는 KAKAO 여야 합니다.',
      );
    }
    const adNetwork = value as AppAdNetwork;
    const row = await this.prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, adNetwork },
      update: { adNetwork },
    });
    return { adNetwork: row.adNetwork };
  }
}
