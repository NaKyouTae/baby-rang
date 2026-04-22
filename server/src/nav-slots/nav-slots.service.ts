import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SLOT_COUNT = 4;
const ALLOWED_MENU_IDS = new Set([
  'nursing-room',
  'temperament',
  'wonder-weeks',
  'sleep-golden-time',
  'growth-record',
  'growth-pattern',
  'air-quality',
  'physical-growth',
]);
const DEFAULT_SLOTS: (string | null)[] = [
  'nursing-room',
  'sleep-golden-time',
  'growth-record',
  null,
];

type SlotsArray = (string | null)[];

@Injectable()
export class NavSlotsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<SlotsArray> {
    const rows = await this.prisma.navSlot.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
    if (rows.length === 0) return [...DEFAULT_SLOTS];
    const slots: SlotsArray = Array(SLOT_COUNT).fill(null);
    for (const row of rows) {
      if (row.position >= 0 && row.position < SLOT_COUNT) {
        slots[row.position] = row.menuId;
      }
    }
    return slots;
  }

  private validateSlots(slots: unknown): SlotsArray {
    if (!Array.isArray(slots) || slots.length !== SLOT_COUNT) {
      throw new BadRequestException(
        `slots must be an array of length ${SLOT_COUNT}`,
      );
    }
    const seen = new Set<string>();
    return slots.map((v) => {
      if (v === null) return null;
      if (typeof v !== 'string' || !ALLOWED_MENU_IDS.has(v)) {
        throw new BadRequestException(`invalid menuId: ${String(v)}`);
      }
      if (seen.has(v)) {
        throw new BadRequestException(`duplicate menuId: ${v}`);
      }
      seen.add(v);
      return v;
    });
  }

  async replaceAll(userId: string, slotsInput: unknown): Promise<SlotsArray> {
    const slots = this.validateSlots(slotsInput);
    await this.prisma.$transaction([
      this.prisma.navSlot.deleteMany({ where: { userId } }),
      this.prisma.navSlot.createMany({
        data: slots
          .map((menuId, position) =>
            menuId ? { userId, position, menuId } : null,
          )
          .filter(
            (x): x is { userId: string; position: number; menuId: string } =>
              x !== null,
          ),
      }),
    ]);
    return slots;
  }

  async reorder(userId: string, from: number, to: number): Promise<SlotsArray> {
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      from >= SLOT_COUNT ||
      to < 0 ||
      to >= SLOT_COUNT
    ) {
      throw new BadRequestException(
        'from/to must be integers within [0, slot_count)',
      );
    }
    if (from === to) return this.findAll(userId);

    const current = await this.findAll(userId);
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return this.replaceAll(userId, next);
  }
}
