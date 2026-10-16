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

// 홈 기록 버튼으로 고를 수 있는 값. 앱 RoomChrome 의 MENU_OPTIONS 와 같다.
const ALLOWED_RECORD_MENU = new Set([
  'formula',
  'breast',
  'pumped',
  'pumping',
  'babyfood',
  'sleep',
  'diaper',
  'bath',
  'temperature',
  'medication',
  'water',
  'milk',
  'snack',
  'play',
  'hospital',
  'etc',
]);
// 홈 기록 버튼 칸 수. 앱 RoomChrome 의 MENU_SLOTS 와 같다.
const RECORD_MENU_SLOTS = 7;

export type ScreenPreference = {
  home: string;
  /** 홈 기록 버튼 구성. 비어 있으면 앱 기본 구성을 쓴다. */
  recordMenu: string[];
};

@Injectable()
export class ScreenPreferenceService {
  constructor(private prisma: PrismaService) {}

  async find(userId: string): Promise<ScreenPreference> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { homeMenu: true, recordMenu: true },
    });
    // null(미설정) → 'home' 기본값으로 정규화해서 반환.
    return {
      home: user?.homeMenu ?? 'home',
      recordMenu: user?.recordMenu ?? [],
    };
  }

  // 'home' 또는 미지정은 null(기본값)로 저장한다.
  private normalize(value: unknown): string | null {
    if (value === null || value === undefined || value === 'home') return null;
    if (typeof value !== 'string' || !ALLOWED_TARGETS.has(value)) {
      throw new BadRequestException(`invalid home: ${JSON.stringify(value)}`);
    }
    return value;
  }

  // 아는 값만, 중복 없이, 칸 수만큼만 받는다.
  private normalizeRecordMenu(value: unknown): string[] {
    if (
      !Array.isArray(value) ||
      value.length > RECORD_MENU_SLOTS ||
      value.some(
        (id) => typeof id !== 'string' || !ALLOWED_RECORD_MENU.has(id),
      ) ||
      new Set(value).size !== value.length
    ) {
      throw new BadRequestException(
        `invalid recordMenu: ${JSON.stringify(value)}`,
      );
    }
    return value as string[];
  }

  // 보낸 항목만 바꾼다. 기록 버튼만 저장할 때 초기 화면이 기본값으로 돌아가면 안 된다.
  async update(
    userId: string,
    body: { home?: unknown; recordMenu?: unknown },
  ): Promise<ScreenPreference> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...('home' in body && { homeMenu: this.normalize(body.home) }),
        ...(body.recordMenu !== undefined && {
          recordMenu: this.normalizeRecordMenu(body.recordMenu),
        }),
      },
    });

    return this.find(userId);
  }
}
