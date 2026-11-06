import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { GrowthRecord, GrowthRecordType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ChildrenService } from '../children/children.service';
import { rewardRecord } from '../coins/coin-rewards';
import { RealtimeService } from '../realtime/realtime.service';

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

/** 보호자 역할 → 다른 기기 토스트에 쓰는 호칭 */
const PARENT_ROLE_LABEL: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  grandmother: '할머니',
  grandfather: '할아버지',
  caregiver: '돌보미',
};

/** 받는 기기가 API 를 다시 부르지 않고 그대로 쓰는 변경 알림 — 이벤트 이름 'growth-record' */
export interface GrowthRecordChange {
  childId: string;
  action: 'created' | 'updated' | 'deleted';
  recordId: string;
  /** created·updated 의 저장된 기록. deleted 면 null. */
  record: GrowthRecord | null;
  /** 홈의 '마지막 수면·수유·기저귀'. 아이 기준 값이라 누가 받든 같다. */
  summary: ChildSummary;
  /** 홈에서 반응 애니메이션을 보여 줄 변경인가 — 새 기록, 또는 진행 중이던 수면의 종료 */
  react: boolean;
  actor: { userId: string; label: string };
}

export interface ChildSummary {
  lastFeedingAt: Date | null;
  lastSleepAt: Date | null;
  lastDiaperAt: Date | null;
  canEndSleep: boolean;
  pendingSleepRecordId: string | null;
}

/** 변경을 만든 요청의 정보. originSocketId 기기에는 알림을 보내지 않는다. */
export interface ChangeOrigin {
  originSocketId?: string;
}

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
  private readonly logger = new Logger(GrowthRecordsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private children: ChildrenService,
    @Optional() private realtime?: RealtimeService,
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
  private canFinishHomeSleep(
    record: {
      type: GrowthRecordType;
      startAt: Date;
      endAt: Date | null;
      data: unknown;
    } | null,
  ): boolean {
    if (!record || record.type !== 'SLEEP') return false;
    if (record.endAt && record.endAt.getTime() !== record.startAt.getTime())
      return false;
    const data = record.data as Record<string, unknown> | null;
    // 기존 메인 수면은 endAt=null로 저장되어 있다.
    return (
      data?.homeSleepPending === true ||
      (!record.endAt && data?.homeSleepPending !== false)
    );
  }

  async widgetSummary(userId: string, childId?: string) {
    const all = await this.children.findAll(userId);
    if (all.length === 0) return null;

    // 요청된 아이가 접근 가능 목록에 있으면 그 아이, 아니면 첫 아이.
    const selected = (childId && all.find((c) => c.id === childId)) || all[0];
    const summary = await this.childSummary(selected.id);

    // birthDate는 @db.Date(UTC 정오 저장) — UTC 파트로 YYYY-MM-DD 추출.
    const b = selected.birthDate;
    const birthDate = `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, '0')}-${String(b.getUTCDate()).padStart(2, '0')}`;

    return {
      childId: selected.id,
      childName: selected.name,
      birthDate,
      ...summary,
      // 전체 아이 목록(순서 고정) — 위젯 페이징용
      children: all.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  /** 홈·위젯의 마지막 기록 시각. 보는 사람과 무관한 아이 기준 값이라 알림에 그대로 싣는다. */
  async childSummary(childId: string): Promise<ChildSummary> {
    // 홈·위젯의 '수유' 칸은 먹은 기록 전체 중 가장 최근 것이다. 마지막이 이유식이면 이유식 시각을 보여준다.
    const FEEDING_TYPES: GrowthRecordType[] = [
      'BREASTFEEDING',
      'FORMULA',
      'PUMPED_FEEDING',
      'MILK',
      'BABY_FOOD',
    ];
    // 수유·기저귀: 시작 시각 기준
    const latestByStart = (where: Prisma.GrowthRecordWhereInput) =>
      this.prisma.growthRecord.findFirst({
        where: { childId, ...where },
        orderBy: { startAt: 'desc' },
        select: { startAt: true },
      });

    // 수면: 종료 시각 기준(진행 중이면 시작). 최근 수면 몇 건에서 endAt(없으면 startAt)이 가장 늦은 것.
    const latestSleepEnd = async (): Promise<Date | null> => {
      const rows = await this.prisma.growthRecord.findMany({
        where: { childId, type: 'SLEEP' },
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

    const [feeding, sleepAt, diaper, latestRecord] = await Promise.all([
      latestByStart({ type: { in: FEEDING_TYPES } }),
      latestSleepEnd(),
      latestByStart({ type: 'DIAPER' }),
      this.prisma.growthRecord.findFirst({
        where: { childId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      lastFeedingAt: feeding?.startAt ?? null,
      lastSleepAt: sleepAt ?? null,
      canEndSleep: this.canFinishHomeSleep(latestRecord),
      pendingSleepRecordId: this.canFinishHomeSleep(latestRecord)
        ? (latestRecord?.id ?? null)
        : null,
      lastDiaperAt: diaper?.startAt ?? null,
    };
  }

  /**
   * 같은 아이를 보는 다른 기기들에 변경을 알린다. 저장이 끝난 뒤 응답을 늦추지 않게 기다리지 않고,
   * 실패해도 저장 결과에는 영향이 없다 — 받는 쪽은 화면에 돌아올 때 다시 받아 맞춘다.
   */
  private notifyChange(
    userId: string,
    change: Pick<
      GrowthRecordChange,
      'childId' | 'action' | 'recordId' | 'record' | 'react'
    >,
    origin?: ChangeOrigin,
  ) {
    const realtime = this.realtime;
    if (!realtime) return;
    void (async () => {
      const [summary, actor] = await Promise.all([
        this.childSummary(change.childId),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { parentRole: true, name: true },
        }),
      ]);
      const label =
        (actor?.parentRole && PARENT_ROLE_LABEL[actor.parentRole]) ||
        (actor?.name ? `${actor.name}님` : '가족');
      const payload: GrowthRecordChange = {
        ...change,
        summary,
        actor: { userId, label },
      };
      realtime.emitToChild(
        change.childId,
        'growth-record',
        payload,
        origin?.originSocketId,
      );
    })().catch((err) =>
      this.logger.warn(`notifyChange failed: ${(err as Error).message}`),
    );
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
  private recordAmounts(type: GrowthRecordType, raw: unknown) {
    const d = raw as Record<string, unknown> | null;
    const values =
      type === 'PUMPING'
        ? d?.volumeMode === 'BOTH'
          ? [d?.amountMl]
          : [d?.leftMl, d?.rightMl, d?.amountMl]
        : type === 'BABY_FOOD'
          ? [d?.amount ?? d?.amountG ?? d?.amountMl]
          : ['FORMULA', 'PUMPED_FEEDING', 'MILK', 'WATER'].includes(type)
            ? [d?.amountMl]
            : [];
    const unit = 'ml';
    return values
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => ({ value, unit }));
  }

  private async rememberRecordAmounts(
    tx: Prisma.TransactionClient,
    record: {
      childId: string;
      type: GrowthRecordType;
      data: unknown;
      updatedAt: Date;
    },
    touch = true,
  ) {
    for (const { value, unit } of this.recordAmounts(
      record.type,
      record.data,
    )) {
      const key = { childId: record.childId, type: record.type, value, unit };
      await tx.recentRecordAmount.upsert({
        where: { childId_type_value_unit: key },
        create: { ...key, lastUsedAt: record.updatedAt },
        update: touch ? { lastUsedAt: record.updatedAt } : {},
      });
    }
  }

  async recentAmounts(
    userId: string,
    childId: string,
    type: string,
    limit = 5,
  ) {
    await this.assertChildAccess(userId, childId);
    const t = this.validateType(type);
    const seen = new Set<string>();
    const amounts: { value: number; unit: string }[] = [];
    const history = await this.prisma.recentRecordAmount.findMany({
      where: { childId, type: t },
      orderBy: [{ lastUsedAt: 'desc' }, { id: 'desc' }],
      take: t === 'BABY_FOOD' ? limit * 2 : limit,
      select: { value: true, unit: true },
    });
    for (const amount of history) {
      const normalized = t === 'BABY_FOOD' ? { ...amount, unit: 'ml' } : amount;
      const key = `${normalized.value}|${normalized.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      amounts.push(normalized);
      if (amounts.length >= limit) return { amounts };
    }
    const batchSize = 100;
    // 최근 100건에 같은 용량만 반복돼도 이전 기록에서 서로 다른 5개를 찾는다.
    for (let skip = 0; amounts.length < limit; skip += batchSize) {
      const records = await this.prisma.growthRecord.findMany({
        where: { childId, type: t },
        orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: batchSize,
        skip,
        select: { data: true },
      });
      for (const r of records) {
        for (const { value, unit } of this.recordAmounts(t, r.data)) {
          const key = `${value}|${unit}`;
          if (seen.has(key)) continue;
          seen.add(key);
          amounts.push({ value, unit });
          if (amounts.length >= limit) return { amounts };
        }
      }
      if (records.length < batchSize) break;
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
    {
      reward = true,
      quickRecord = false,
      notify = true,
      originSocketId,
    }: {
      reward?: boolean;
      quickRecord?: boolean;
      /** 가져오기처럼 한꺼번에 들어오는 기록은 하나하나 알리지 않는다 */
      notify?: boolean;
    } & ChangeOrigin = {},
  ) {
    await this.assertChildAccess(userId, input.childId);
    const type = this.validateType(input.type);
    if (!input.startAt) throw new BadRequestException('startAt is required');

    const limited = (files ?? []).slice(0, 5);
    // 이미지 업로드를 병렬 처리 (Promise.all은 순서 보존 → uploaded[0]이 대표 이미지)
    const uploaded = await Promise.all(
      limited.map((file) => this.storage.upload(file, 'growth-records')),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // 같은 아기의 동시 기록 요청도 순서대로 처리해 중복 수면 생성을 막는다.
      await tx.$queryRaw`SELECT id FROM children WHERE id = ${input.childId} FOR UPDATE`;
      if (quickRecord && type === 'SLEEP') {
        const previous = await tx.growthRecord.findFirst({
          where: { childId: input.childId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        const startAt = new Date(input.startAt);
        if (
          this.canFinishHomeSleep(previous) &&
          previous &&
          startAt.getTime() >= previous.startAt.getTime()
        ) {
          const ended = await tx.growthRecord.update({
            where: { id: previous.id },
            data: {
              endAt: startAt,
              data: {
                ...((previous.data as Record<string, Prisma.InputJsonValue>) ??
                  {}),
                homeSleepPending: false,
              },
            },
          });
          return { record: ended, action: 'updated' as const };
        }
      }
      const record = await tx.growthRecord.create({
        data: {
          userId,
          childId: input.childId,
          type,
          startAt: new Date(input.startAt),
          endAt:
            quickRecord && type === 'SLEEP'
              ? null
              : input.endAt
                ? new Date(input.endAt)
                : null,
          memo: input.memo ?? null,
          imageUrl: uploaded[0] ?? null,
          imageUrls: uploaded,
          data:
            type === 'SLEEP'
              ? {
                  ...((this.parseData(input.data) as Record<
                    string,
                    Prisma.InputJsonValue
                  >) ?? {}),
                  homeSleepPending: quickRecord,
                }
              : this.parseData(input.data),
        },
      });
      if (reward) await this.rememberRecordAmounts(tx, record);
      // 가져오기는 수천 건이 한 번에 들어온다. 그만큼 보석을 주면 재화가 무너진다.
      if (reward) await rewardRecord(tx, input.childId);
      return { record, action: 'created' as const };
    });
    if (notify) {
      this.notifyChange(
        userId,
        {
          childId: result.record.childId,
          action: result.action,
          recordId: result.record.id,
          record: result.record,
          react: true,
        },
        { originSocketId },
      );
    }
    return result.record;
  }

  async update(
    userId: string,
    id: string,
    input: Partial<UpsertInput>,
    files?: Express.Multer.File[],
    keepImageUrlsRaw?: string,
    origin?: ChangeOrigin,
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

    let nextData =
      input.data === undefined
        ? undefined
        : (this.parseData(input.data) ?? Prisma.JsonNull);
    const nextType = input.type ? this.validateType(input.type) : existing.type;
    if (nextType === 'SLEEP') {
      const nextStart = input.startAt
        ? new Date(input.startAt)
        : existing.startAt;
      const nextEnd =
        input.endAt === undefined
          ? existing.endAt
          : input.endAt
            ? new Date(input.endAt)
            : null;
      const pending =
        this.canFinishHomeSleep(existing) &&
        (!nextEnd || nextEnd.getTime() === nextStart.getTime());
      const raw =
        input.data === undefined ? existing.data : this.parseData(input.data);
      nextData = {
        ...((raw as Record<string, Prisma.InputJsonValue>) ?? {}),
        homeSleepPending: pending,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 덮어쓰기 전 값도 이력으로 보존한다.
      await this.rememberRecordAmounts(tx, existing, false);
      const record = await tx.growthRecord.update({
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
          data: nextData,
          imageUrl: nextUrls === undefined ? undefined : (nextUrls[0] ?? null),
          imageUrls: nextUrls === undefined ? undefined : nextUrls,
        },
      });
      await this.rememberRecordAmounts(tx, record);
      return record;
    });
    // 홈에서 수면 종료를 누른 것처럼, 진행 중이던 수면이 끝났으면 반응을 보여 준다.
    const sleepEnded =
      updated.type === 'SLEEP' &&
      this.canFinishHomeSleep(existing) &&
      !this.canFinishHomeSleep(updated);
    this.notifyChange(
      userId,
      {
        childId: updated.childId,
        action: 'updated',
        recordId: updated.id,
        record: updated,
        react: sleepEnded,
      },
      origin,
    );
    return updated;
  }

  async remove(userId: string, id: string, origin?: ChangeOrigin) {
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
    this.notifyChange(
      userId,
      {
        childId: existing.childId,
        action: 'deleted',
        recordId: id,
        record: null,
        react: false,
      },
      origin,
    );
    return { ok: true };
  }
}
