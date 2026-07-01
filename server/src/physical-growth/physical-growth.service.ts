import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';

@Injectable()
export class PhysicalGrowthService {
  constructor(
    private prisma: PrismaService,
    private children: ChildrenService,
  ) {}

  private assertChildAccess(userId: string, childId: string) {
    return this.children.assertAccess(userId, childId);
  }

  async findAll(userId: string, childId: string) {
    await this.assertChildAccess(userId, childId);
    return this.prisma.physicalGrowth.findMany({
      where: { childId },
      orderBy: { measuredAt: 'desc' },
      take: 500, // 성장 측정은 드물어 500이면 수년치 — 무제한 스캔 방지
    });
  }

  async create(
    userId: string,
    input: {
      childId: string;
      measuredAt: string;
      heightCm?: number;
      weightKg?: number;
      headCircumCm?: number;
      memo?: string;
    },
  ) {
    await this.assertChildAccess(userId, input.childId);

    if (!input.measuredAt || !/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) {
      throw new BadRequestException('measuredAt must be YYYY-MM-DD');
    }
    if (
      input.heightCm == null &&
      input.weightKg == null &&
      input.headCircumCm == null
    ) {
      throw new BadRequestException(
        '키, 몸무게, 머리둘레 중 하나 이상 입력해주세요.',
      );
    }

    return this.prisma.physicalGrowth.create({
      data: {
        userId,
        childId: input.childId,
        measuredAt: new Date(`${input.measuredAt}T12:00:00.000Z`),
        heightCm: input.heightCm ?? null,
        weightKg: input.weightKg ?? null,
        headCircumCm: input.headCircumCm ?? null,
        memo: input.memo ?? null,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    input: {
      measuredAt?: string;
      heightCm?: number;
      weightKg?: number;
      headCircumCm?: number;
      memo?: string;
    },
  ) {
    const existing = await this.prisma.physicalGrowth.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('기록을 찾을 수 없습니다.');
    await this.assertChildAccess(userId, existing.childId);

    const data: Record<string, unknown> = {};
    if (input.measuredAt) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt)) {
        throw new BadRequestException('measuredAt must be YYYY-MM-DD');
      }
      data.measuredAt = new Date(`${input.measuredAt}T12:00:00.000Z`);
    }
    if (input.heightCm !== undefined) data.heightCm = input.heightCm;
    if (input.weightKg !== undefined) data.weightKg = input.weightKg;
    if (input.headCircumCm !== undefined)
      data.headCircumCm = input.headCircumCm;
    if (input.memo !== undefined) data.memo = input.memo;

    return this.prisma.physicalGrowth.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.physicalGrowth.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('기록을 찾을 수 없습니다.');
    await this.assertChildAccess(userId, existing.childId);
    await this.prisma.physicalGrowth.delete({ where: { id } });
    return { ok: true };
  }
}
