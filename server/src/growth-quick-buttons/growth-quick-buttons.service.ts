import { BadRequestException, Injectable } from '@nestjs/common';
import { GrowthRecordType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_TYPES: GrowthRecordType[] = [
  'BREASTFEEDING',
  'FORMULA',
  'BABY_FOOD',
  'SLEEP',
  'PUMPED_FEEDING',
  'PUMPING',
  'BATH',
  'HOSPITAL',
  'TEMPERATURE',
  'MEDICATION',
  'DIAPER',
  'SNACK',
  'MILK',
  'WATER',
  'PLAY',
  'TUMMY_TIME',
  'ETC',
];
const ALLOWED_SET = new Set<GrowthRecordType>(ALLOWED_TYPES);
const DEFAULT_TYPES: GrowthRecordType[] = [
  'FORMULA',
  'SLEEP',
  'DIAPER',
  'BABY_FOOD',
];

@Injectable()
export class GrowthQuickButtonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<GrowthRecordType[]> {
    const rows = await this.prisma.growthQuickButton.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
    if (rows.length === 0) return [...DEFAULT_TYPES];
    return rows.map((r) => r.type);
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
