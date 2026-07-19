import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GrowthRecordType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ChildrenService } from '../children/children.service';

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
    private children: ChildrenService,
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

  // 권한 체크는 child.group 멤버십 기준 — ChildrenService.assertAccess에 위임.
  private assertChildAccess(userId: string, childId: string) {
    return this.children.assertAccess(userId, childId);
  }

  async earliestDate(userId: string, childId: string) {
    await this.assertChildAccess(userId, childId);
    const rec = await this.prisma.growthRecord.findFirst({
      where: { childId },
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

  // 홈 화면 위젯용 요약 — 선택된 아이 정보 + 마지막 수유/수면/대변 "시각" + 전체 아이 목록.
  // 상대시간("3시간 22분 전")은 기기에서 계산하므로 절대 시각만 내려준다.
  // childId 미지정(또는 삭제된 아이)이면 첫 아이로 폴백.
  // children 목록은 위젯의 탭-페이징(다음 아이로 넘기기)에 사용.
  async widgetSummary(userId: string, childId?: string) {
    const all = await this.children.findAll(userId);
    if (all.length === 0) return null;

    // 요청된 아이가 접근 가능 목록에 있으면 그 아이, 아니면 첫 아이.
    const selected = (childId && all.find((c) => c.id === childId)) || all[0];

    const FEEDING_TYPES: GrowthRecordType[] = [
      'BREASTFEEDING',
      'FORMULA',
      'PUMPED_FEEDING',
      'MILK',
    ];
    // 수유·기저귀: 시작 시각 기준
    const latestByStart = (where: Prisma.GrowthRecordWhereInput) =>
      this.prisma.growthRecord.findFirst({
        where: { childId: selected.id, ...where },
        orderBy: { startAt: 'desc' },
        select: { startAt: true },
      });

    // 수면: 종료 시각 기준(진행 중이면 시작). 최근 수면 몇 건에서 endAt(없으면 startAt)이 가장 늦은 것.
    const latestSleepEnd = async (): Promise<Date | null> => {
      const rows = await this.prisma.growthRecord.findMany({
        where: { childId: selected.id, type: 'SLEEP' },
        orderBy: { startAt: 'desc' },
        take: 20,
        select: { startAt: true, endAt: true },
      });
      let best: Date | null = null;
      for (const r of rows) {
        const t = r.endAt ?? r.startAt;
        if (!best || t.getTime() > best.getTime()) best = t;
      }
      return best;
    };

    const [feeding, sleepAt, diaper] = await Promise.all([
      latestByStart({ type: { in: FEEDING_TYPES } }),
      latestSleepEnd(),
      latestByStart({ type: 'DIAPER' }),
    ]);

    // birthDate는 @db.Date(UTC 정오 저장) — UTC 파트로 YYYY-MM-DD 추출.
    const b = selected.birthDate;
    const birthDate = `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, '0')}-${String(b.getUTCDate()).padStart(2, '0')}`;

    return {
      childId: selected.id,
      childName: selected.name,
      birthDate,
      lastFeedingAt: feeding?.startAt ?? null,
      lastSleepAt: sleepAt ?? null,
      lastDiaperAt: diaper?.startAt ?? null,
      // 전체 아이 목록(순서 고정) — 위젯 페이징용
      children: all.map((c) => ({ id: c.id, name: c.name })),
    };
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
        childId,
        startAt: { gte: start, lt: end },
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      take: 2000, // 정상 사용(30~90일)엔 넉넉, 병적으로 넓은 범위만 방어
    });
  }

  // 먹은 양 빠른 입력용 — 해당 타입의 최근 기록에서 중복 제거한 먹은 양 N개.
  // 수유류(분유/유축수유/우유/물)는 amountMl(ml 고정), 이유식은 amount(+amountUnit: ml/g).
  async recentAmounts(
    userId: string,
    childId: string,
    type: string,
    limit = 5,
  ) {
    await this.assertChildAccess(userId, childId);
    const t = this.validateType(type);
    // 날짜 구간이 아니라 "최근 기록"에서 가져온다(먹은 양이 오래 전 기록에만 있을 수 있음).
    const records = await this.prisma.growthRecord.findMany({
      where: { childId, type: t },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: { data: true },
    });
    const isBabyFood = t === 'BABY_FOOD';
    const seen = new Set<string>();
    const amounts: { value: number; unit: string }[] = [];
    for (const r of records) {
      const d = r.data as Record<string, unknown> | null;
      const value = Number(isBabyFood ? d?.amount : d?.amountMl);
      if (!Number.isFinite(value) || value <= 0) continue;
      const unit =
        isBabyFood && typeof d?.amountUnit === 'string' ? d.amountUnit : 'ml';
      const key = `${value}|${unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      amounts.push({ value, unit });
      if (amounts.length >= limit) break;
    }
    return { amounts };
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
        childId,
        startAt: { gte: start, lt: end },
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      take: 200, // 하루치 — 200이면 충분
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
    // 이미지 업로드를 병렬 처리 (Promise.all은 순서 보존 → uploaded[0]이 대표 이미지)
    const uploaded = await Promise.all(
      limited.map((file) => this.storage.upload(file, 'growth-records')),
    );

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
      // 삭제(순서 무관)와 업로드(순서 보존)를 각각 병렬 처리
      const [, uploaded] = await Promise.all([
        Promise.all(
          removed.map((url) => this.storage.delete(url).catch(() => {})),
        ),
        Promise.all(
          (files ?? [])
            .slice(0, 5)
            .map((file) => this.storage.upload(file, 'growth-records')),
        ),
      ]);

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
    await Promise.all(
      urls.map((url) => this.storage.delete(url).catch(() => {})),
    );
    await this.prisma.growthRecord.delete({ where: { id } });
    return { ok: true };
  }
}
