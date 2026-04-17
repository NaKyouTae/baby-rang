import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GrowthRecordType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_TYPES = new Set<GrowthRecordType>([
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
] as GrowthRecordType[]);

interface UpsertInput {
  childId: string;
  type: string;
  startAt: string;
  endAt?: string | null;
  memo?: string | null;
  data?: unknown;
}

@Injectable()
export class GrowthRecordsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private validateType(type: string): GrowthRecordType {
    if (!ALLOWED_TYPES.has(type as GrowthRecordType)) {
      throw new BadRequestException(`invalid type: ${type}`);
    }
    return type as GrowthRecordType;
  }

  private parseData(raw: unknown): Prisma.InputJsonValue | undefined {
    if (raw == null || raw === '') return undefined;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        throw new BadRequestException('data must be valid JSON');
      }
    }
    return raw as Prisma.InputJsonValue;
  }

  private async assertChildAccess(userId: string, childId: string) {
    // 1. 직접 소유자인지
    const isOwner = await this.prisma.child.findFirst({
      where: { id: childId, userId },
      select: { id: true },
    });
    if (isOwner) return;

    // 2. 공유 멤버인지
    const isMember = await this.prisma.childShareMember.findFirst({
      where: {
        userId,
        share: { childId, isActive: true },
      },
    });
    if (!isMember) throw new NotFoundException('아이를 찾을 수 없습니다.');
  }

  async earliestDate(userId: string, childId: string) {
    await this.assertChildAccess(userId, childId);
    const rec = await this.prisma.growthRecord.findFirst({
      where: { userId, childId },
      orderBy: { startAt: 'asc' },
      select: { startAt: true },
    });
    if (!rec) return { date: null };
    // KST 기준 YYYY-MM-DD
    const kst = new Date(rec.startAt.getTime() + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const d = String(kst.getUTCDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}` };
  }

  async findByRange(userId: string, childId: string, from: string, to: string) {
    await this.assertChildAccess(userId, childId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException('from/to must be YYYY-MM-DD');
    }
    const start = new Date(`${from}T00:00:00.000+09:00`);
    // to 포함(inclusive) — to 다음날 00:00 KST 직전까지
    const end = new Date(`${to}T00:00:00.000+09:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    return this.prisma.growthRecord.findMany({
      where: {
        userId,
        childId,
        startAt: { gte: start, lt: end },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findByDate(userId: string, childId: string, date: string) {
    await this.assertChildAccess(userId, childId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const start = new Date(`${date}T00:00:00.000+09:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.growthRecord.findMany({
      where: {
        userId,
        childId,
        startAt: { gte: start, lt: end },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  private mergedExistingUrls(existing: {
    imageUrl: string | null;
    imageUrls: string[];
  }): string[] {
    const urls = [...(existing.imageUrls ?? [])];
    if (existing.imageUrl && !urls.includes(existing.imageUrl))
      urls.unshift(existing.imageUrl);
    return urls;
  }

  async create(
    userId: string,
    input: UpsertInput,
    files?: Express.Multer.File[],
  ) {
    await this.assertChildAccess(userId, input.childId);
    const type = this.validateType(input.type);
    if (!input.startAt) throw new BadRequestException('startAt is required');

    const limited = (files ?? []).slice(0, 5);
    const uploaded: string[] = [];
    for (const file of limited) {
      const url = await this.storage.upload(file, 'growth-records');
      uploaded.push(url);
    }

    return this.prisma.growthRecord.create({
      data: {
        userId,
        childId: input.childId,
        type,
        startAt: new Date(input.startAt),
        endAt: input.endAt ? new Date(input.endAt) : null,
        memo: input.memo ?? null,
        imageUrl: uploaded[0] ?? null,
        imageUrls: uploaded,
        data: this.parseData(input.data),
      },
    });
  }

  async update(
    userId: string,
    id: string,
    input: Partial<UpsertInput>,
    files?: Express.Multer.File[],
    keepImageUrlsRaw?: string,
  ) {
    const existing = await this.prisma.growthRecord.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('기록을 찾을 수 없습니다.');
    await this.assertChildAccess(userId, existing.childId);

    let nextUrls: string[] | undefined = undefined;
    const hasImagePayload =
      files !== undefined || keepImageUrlsRaw !== undefined;

    if (hasImagePayload) {
      let keepUrls: string[] = [];
      if (keepImageUrlsRaw) {
        try {
          const parsed = JSON.parse(keepImageUrlsRaw);
          if (Array.isArray(parsed))
            keepUrls = parsed.filter((s) => typeof s === 'string');
        } catch {
          throw new BadRequestException(
            'keepImageUrls must be JSON array of strings',
          );
        }
      }

      const previousUrls = this.mergedExistingUrls(existing);
      const removed = previousUrls.filter((u) => !keepUrls.includes(u));
      for (const url of removed) {
        await this.storage.delete(url).catch(() => {});
      }

      const uploaded: string[] = [];
      for (const file of (files ?? []).slice(0, 5)) {
        const url = await this.storage.upload(file, 'growth-records');
        uploaded.push(url);
      }

      nextUrls = [...keepUrls, ...uploaded].slice(0, 5);
    }

    return this.prisma.growthRecord.update({
      where: { id },
      data: {
        type: input.type ? this.validateType(input.type) : undefined,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt:
          input.endAt === undefined
            ? undefined
            : input.endAt === null || input.endAt === ''
              ? null
              : new Date(input.endAt),
        memo: input.memo === undefined ? undefined : input.memo,
        data:
          input.data === undefined
            ? undefined
            : (this.parseData(input.data) ?? Prisma.JsonNull),
        imageUrl: nextUrls === undefined ? undefined : (nextUrls[0] ?? null),
        imageUrls: nextUrls === undefined ? undefined : nextUrls,
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.growthRecord.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('기록을 찾을 수 없습니다.');
    await this.assertChildAccess(userId, existing.childId);
    const urls = this.mergedExistingUrls(existing);
    for (const url of urls) await this.storage.delete(url).catch(() => {});
    await this.prisma.growthRecord.delete({ where: { id } });
    return { ok: true };
  }
}
