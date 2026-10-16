import { BadRequestException, Injectable } from '@nestjs/common';
import { GrowthRecordType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TYPES: GrowthRecordType[] = [
  'FORMULA',
  'BREASTFEEDING',
  'PUMPED_FEEDING',
  'PUMPING',
  'BABY_FOOD',
  'SLEEP',
  'DIAPER',
];
const ALLOWED_SET = new Set<GrowthRecordType>(DEFAULT_TYPES);
const LEGACY_DEFAULT = ['FORMULA', 'SLEEP', 'DIAPER', 'BABY_FOOD'];

@Injectable()
export class GrowthQuickButtonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<GrowthRecordType[]> {
    const rows = await this.prisma.growthQuickButton.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
    if (rows.length === 0) return [...DEFAULT_TYPES];
    const types = rows
      .map((r) => r.type)
      .filter((type) => ALLOWED_SET.has(type));
    if (
      types.length === 0 ||
      (types.length === LEGACY_DEFAULT.length &&
        types.every((type, i) => type === LEGACY_DEFAULT[i]))
    )
      return [...DEFAULT_TYPES];
    return types;
  }

  async replaceAll(
    userId: string,
    typesInput: unknown,
  ): Promise<GrowthRecordType[]> {
    if (!Array.isArray(typesInput)) {
      throw new BadRequestException('types must be an array');
    }
    const seen = new Set<string>();
    const types: GrowthRecordType[] = typesInput.map((v) => {
      if (typeof v !== 'string' || !ALLOWED_SET.has(v as GrowthRecordType)) {
        throw new BadRequestException(`invalid type: ${String(v)}`);
      }
      if (seen.has(v)) {
        throw new BadRequestException(`duplicate type: ${v}`);
      }
      seen.add(v);
      return v as GrowthRecordType;
    });

    await this.prisma.$transaction([
      this.prisma.growthQuickButton.deleteMany({ where: { userId } }),
      this.prisma.growthQuickButton.createMany({
        data: types.map((type, position) => ({ userId, type, position })),
      }),
    ]);
    return types;
  }
}
