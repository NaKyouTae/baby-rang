import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgeGroup, TestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { StorageService } from '../storage/storage.service';
import { CrawlerVisitsService } from '../crawler-visits/crawler-visits.service';
import { AdminGuard } from './admin.guard';
import {
  DIMENSIONS,
  DimensionKey,
  NOTICE,
  SCALE,
  getQuestions,
} from '../temperament/data/questions';
import {
  Scores,
  Level,
  PrimaryType,
  buildFreeContentByType,
  buildPaidContent,
  buildSummary,
} from '../temperament/scoring';

const PRIMARY_TYPES: { type: PrimaryType; label: string }[] = [
  { type: 'explorer', label: '탐험가형' },
  { type: 'socializer', label: '사교가형' },
  { type: 'observer', label: '관찰자형' },
  { type: 'concentrator', label: '집중가형' },
  { type: 'balanced', label: '균형성장형' },
];

// 미리보기용: 해당 유형 대표 차원은 high(85), 그 외는 medium(55)로 가짜 점수 생성
const TYPE_TO_DIMENSION: Record<PrimaryType, DimensionKey | null> = {
  explorer: 'activity',
  socializer: 'sociability',
  observer: 'sensitivity',
  concentrator: 'persistence',
  balanced: null,
};

function buildPreviewScores(
  primaryType: PrimaryType,
  emotionModifier: boolean,
): Scores {
  const focus = TYPE_TO_DIMENSION[primaryType];
  const out = {} as Scores;
  for (const dim of DIMENSIONS) {
    let score = 55;
    let level: Level = 'medium';
    if (dim.key === focus) {
      score = 85;
      level = 'high';
    }
    if (dim.key === 'emotional_intensity' && emotionModifier) {
      score = 80;
      level = 'high';
    }
    out[dim.key] = {
      raw: Math.round((score / 100) * 20) + 5,
      score,
      level,
      label: dim.label,
    };
  }
  return out;
}

const GROWTH_TYPE_LABELS: Record<string, string> = {
  BREASTFEEDING: '모유수유',
  FORMULA: '분유수유',
  BABY_FOOD: '이유식',
  SLEEP: '수면',
  PUMPED_FEEDING: '유축수유',
  PUMPING: '유축',
  BATH: '목욕',
  HOSPITAL: '병원',
  TEMPERATURE: '체온',
  MEDICATION: '투약',
  DIAPER: '기저귀',
  SNACK: '간식',
  MILK: '우유',
  WATER: '물',
  PLAY: '놀이',
  TUMMY_TIME: '터미타임',
  ETC: '기타',
};

const VALID_TEST_TYPES: TestType[] = ['TEMPERAMENT', 'DEVELOPMENT', 'UNICORN'];
const isValidTestType = (v: unknown): v is TestType =>
  typeof v === 'string' && (VALID_TEST_TYPES as string[]).includes(v);

const VALID_AGE_GROUPS: AgeGroup[] = ['newborn', 'before_first', 'after_first'];
const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  newborn: '신생아 (0~3개월)',
  before_first: '돌 이전 (4~12개월)',
  after_first: '돌 이후 (13개월~)',
};

@Controller('admin')
export class AdminAuthController {
  // ===== Login (public, credential-based) =====
  @Post('login')
  login(@Body() body: { username?: string; password?: string }) {
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    const token = process.env.ADMIN_TOKEN;
    if (!expectedUser || !expectedPass || !token) {
      throw new UnauthorizedException('Admin not configured');
    }
    // 대소문자 구분 비교 (=== 는 기본적으로 case-sensitive)
    if (body.username !== expectedUser || body.password !== expectedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { token };
  }
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private paymentsService: PaymentsService,
    private crawlerVisits: CrawlerVisitsService,
  ) {}

  // ===== Upload =====
  @Post('banners/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBannerImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일이 필요합니다.');
    const url = await this.storage.upload(file, 'banners');
    return { url };
  }

  @Post('tests/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTestThumbnail(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일이 필요합니다.');
    const url = await this.storage.upload(file, 'tests');
    return { url };
  }

  @Get('me')
  me() {
    return { ok: true };
  }

  // ===== Dashboard =====
  @Get('stats')
  async stats() {
    // 이번 주 시작(월요일 00:00, 서버 로컬 기준)
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

    const [
      users,
      children,
      banners,
      paymentsPaid,
      paymentsTotal,
      sumAgg,
      moms,
      dads,
      weekSignups,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.child.count(),
      this.prisma.banner.count(),
      this.prisma.payment.count({ where: { status: 'PAID' } }),
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
      this.prisma.user.count({ where: { parentRole: 'mom' } }),
      this.prisma.user.count({ where: { parentRole: 'dad' } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    ]);
    return {
      users,
      children,
      banners,
      payments: { paid: paymentsPaid, total: paymentsTotal },
      revenue: sumAgg._sum.amount ?? 0,
      moms,
      dads,
      weekSignups,
    };
  }

  // ===== Users =====
  @Get('users')
  async users(@Query('page') page = '1', @Query('limit') limit = '20') {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // 마지막 활동 시각은 컬럼이 아니라 여러 테이블의 최신 기록에서 계산한다.
    // 그래서 DB 의 orderBy 로는 정렬할 수 없고, 전체를 계산해 정렬한 뒤
    // 해당 페이지만 다시 조회한다.
    const [all, lastActiveMap] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, createdAt: true } }),
      this.lastActivityMap(),
    ]);

    // 활동 기록이 없는 사용자는 가입 시각을 기준으로 둔다.
    // null 을 맨 뒤로 몰면 신규 가입자가 목록에서 사라져 관리가 어렵다.
    const sortKey = (u: { id: string; createdAt: Date }) =>
      (lastActiveMap.get(u.id) ?? u.createdAt).getTime();
    const ordered = [...all].sort((a, b) => sortKey(b) - sortKey(a));
    const pageIds = ordered.slice((p - 1) * l, p * l).map((u) => u.id);

    const items = await this.prisma.user.findMany({
      where: { id: { in: pageIds } },
      include: {
        _count: { select: { groupMemberships: true, payments: true } },
      },
    });
    // in 조회는 순서를 보장하지 않으므로 정렬 순서대로 다시 배열한다.
    const byId = new Map(items.map((u) => [u.id, u]));
    const withActivity = pageIds.flatMap((id) => {
      const u = byId.get(id);
      return u ? [{ ...u, lastActiveAt: lastActiveMap.get(id) ?? null }] : [];
    });

    return { items: withActivity, total: all.length, page: p, limit: l };
  }

  @Get('users/:id')
  async userDetail(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        accounts: {
          select: { provider: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        groupMemberships: {
          include: { group: { include: { children: true } } },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) return null;
    const [lastActiveMap, recentActivity] = await Promise.all([
      this.lastActivityMap([id]),
      this.recentActivity(id),
    ]);
    return {
      ...user,
      lastActiveAt: lastActiveMap.get(id) ?? null,
      recentActivity,
    };
  }

  // 여러 사용자의 "마지막 활동 시각"을 한 번에 조회한다.
  // 앱 접속 시각을 따로 저장하지 않으므로, 사용자가 남긴 실제 기록들의
  // 최신 타임스탬프를 활동 시각으로 본다.
  private async lastActivityMap(
    userIds?: string[],
  ): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (userIds && userIds.length === 0) return map;
    // userIds 를 주지 않으면 전체 사용자를 대상으로 한다(목록 정렬용).
    // 전체 id 를 in 으로 넘기면 쿼리가 비대해지므로 조건을 아예 빼는 편이 낫다.
    const where = userIds ? { userId: { in: userIds } } : {};
    const [growth, physical, temperament, payment, noticeRead] =
      await Promise.all([
        this.prisma.growthRecord.groupBy({
          by: ['userId'],
          where,
          _max: { createdAt: true },
        }),
        this.prisma.physicalGrowth.groupBy({
          by: ['userId'],
          where,
          _max: { createdAt: true },
        }),
        this.prisma.temperamentSubmission.groupBy({
          by: ['userId'],
          where,
          _max: { createdAt: true },
        }),
        this.prisma.payment.groupBy({
          by: ['userId'],
          where,
          _max: { requestedAt: true },
        }),
        this.prisma.noticeRead.groupBy({
          by: ['userId'],
          where,
          _max: { readAt: true },
        }),
      ]);
    const merge = <T extends { userId: string | null }>(
      rows: T[],
      pick: (r: T) => Date | null,
    ) => {
      for (const r of rows) {
        const at = pick(r);
        if (!r.userId || !at) continue;
        const cur = map.get(r.userId);
        if (!cur || at > cur) map.set(r.userId, at);
      }
    };
    merge(growth, (r) => r._max.createdAt);
    merge(physical, (r) => r._max.createdAt);
    merge(temperament, (r) => r._max.createdAt);
    merge(payment, (r) => r._max.requestedAt);
    merge(noticeRead, (r) => r._max.readAt);
    return map;
  }

  // 한 사용자의 최근 활동 타임라인 (최신순 상위 항목).
  private async recentActivity(userId: string) {
    const [growth, physical, temperament] = await Promise.all([
      this.prisma.growthRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, type: true, createdAt: true },
      }),
      this.prisma.physicalGrowth.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, createdAt: true },
      }),
      this.prisma.temperamentSubmission.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, status: true, createdAt: true },
      }),
    ]);
    const items: { kind: string; label: string; at: Date }[] = [
      ...growth.map((g) => ({
        kind: 'growth_record',
        label: GROWTH_TYPE_LABELS[g.type] ?? '성장기록',
        at: g.createdAt,
      })),
      ...physical.map((p) => ({
        kind: 'physical_growth',
        label: '신체성장 기록',
        at: p.createdAt,
      })),
      ...temperament.map((t) => ({
        kind: 'temperament',
        label: t.status === 'COMPLETED' ? '기질검사 완료' : '기질검사 진행',
        at: t.createdAt,
      })),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  }

  // ===== Payments =====
  @Get('payments')
  async payments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page: p, limit: l };
  }

  @Post('payments/:orderId/refund')
  async refundPayment(
    @Param('orderId') orderId: string,
    @Body() body: { reason: string; amount?: number },
  ) {
    return this.paymentsService.refundTossByAdmin(orderId, {
      reason: body?.reason,
      amount: body?.amount,
    });
  }

  // ===== Banners =====
  @Get('banners')
  async listBanners() {
    const items = await this.prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { items };
  }

  @Post('banners')
  async createBanner(@Body() body: any) {
    return this.prisma.banner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle ?? null,
        imageUrl: body.imageUrl ?? null,
        bgColor: body.bgColor ?? null,
        linkUrl: body.linkUrl,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });
  }

  @Patch('banners/:id')
  async updateBanner(@Param('id') id: string, @Body() body: any) {
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.bgColor !== undefined && { bgColor: body.bgColor }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.startsAt !== undefined && {
          startsAt: body.startsAt ? new Date(body.startsAt) : null,
        }),
        ...(body.endsAt !== undefined && {
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
        }),
      },
    });
  }

  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Tests =====
  @Get('tests')
  async listTests() {
    const items = await this.prisma.test.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { items };
  }

  @Post('tests')
  async createTest(@Body() body: any) {
    const type = isValidTestType(body.type)
      ? (body.type as TestType)
      : 'TEMPERAMENT';
    return this.prisma.test.create({
      data: {
        type,
        title: body.title,
        description: body.description ?? null,
        thumbnailUrl: body.thumbnailUrl ?? null,
        linkUrl: body.linkUrl,
        labels: Array.isArray(body.labels) ? body.labels : [],
        durationMinMinutes:
          typeof body.durationMinMinutes === 'number'
            ? body.durationMinMinutes
            : null,
        durationMaxMinutes:
          typeof body.durationMaxMinutes === 'number'
            ? body.durationMaxMinutes
            : null,
        questionCount:
          typeof body.questionCount === 'number' ? body.questionCount : null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
  }

  @Patch('tests/:id')
  async updateTest(@Param('id') id: string, @Body() body: any) {
    return this.prisma.test.update({
      where: { id },
      data: {
        ...(body.type !== undefined &&
          isValidTestType(body.type) && {
            type: body.type as TestType,
          }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.thumbnailUrl !== undefined && {
          thumbnailUrl: body.thumbnailUrl,
        }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl }),
        ...(body.labels !== undefined && { labels: body.labels }),
        ...(body.durationMinMinutes !== undefined && {
          durationMinMinutes: body.durationMinMinutes,
        }),
        ...(body.durationMaxMinutes !== undefined && {
          durationMaxMinutes: body.durationMaxMinutes,
        }),
        ...(body.questionCount !== undefined && {
          questionCount: body.questionCount,
        }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
  }

  @Delete('tests/:id')
  async deleteTest(@Param('id') id: string) {
    await this.prisma.test.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Notices =====
  @Get('notices')
  async listNotices() {
    const items = await this.prisma.notice.findMany({
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
    return { items };
  }

  @Post('notices')
  async createNotice(@Body() body: any) {
    return this.prisma.notice.create({
      data: {
        title: body.title,
        content: body.content,
        isPinned: body.isPinned ?? false,
        isPublished: body.isPublished ?? true,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      },
    });
  }

  @Patch('notices/:id')
  async updateNotice(@Param('id') id: string, @Body() body: any) {
    return this.prisma.notice.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
        ...(body.isPublished !== undefined && {
          isPublished: body.isPublished,
        }),
        ...(body.publishedAt !== undefined && {
          publishedAt: body.publishedAt
            ? new Date(body.publishedAt)
            : new Date(),
        }),
      },
    });
  }

  @Delete('notices/:id')
  async deleteNotice(@Param('id') id: string) {
    await this.prisma.notice.delete({ where: { id } });
    return { ok: true };
  }

  // ===== FAQs =====
  @Get('faqs')
  async listFaqs() {
    const items = await this.prisma.faq.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return { items };
  }

  @Post('faqs')
  async createFaq(@Body() body: any) {
    return this.prisma.faq.create({
      data: {
        category: body.category?.trim() || '일반',
        question: body.question,
        answer: body.answer,
        order: body.order ?? 0,
        isPublished: body.isPublished ?? true,
      },
    });
  }

  @Patch('faqs/:id')
  async updateFaq(@Param('id') id: string, @Body() body: any) {
    return this.prisma.faq.update({
      where: { id },
      data: {
        ...(body.category !== undefined && {
          category: body.category?.trim() || '일반',
        }),
        ...(body.question !== undefined && { question: body.question }),
        ...(body.answer !== undefined && { answer: body.answer }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.isPublished !== undefined && {
          isPublished: body.isPublished,
        }),
      },
    });
  }

  @Delete('faqs/:id')
  async deleteFaq(@Param('id') id: string) {
    await this.prisma.faq.delete({ where: { id } });
    return { ok: true };
  }

  // ===== AI 크롤러 유입 =====
  @Get('crawler-visits')
  async crawlerVisitSummary(@Query('days') days?: string) {
    const parsed = Number(days);
    const window =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
    return this.crawlerVisits.summary(window);
  }

  // ===== Nursing Room Reports =====
  @Get('nursing-rooms')
  async listNursingRooms(@Query('status') status?: string) {
    const where = status ? { status: status as any } : {};
    const items = await this.prisma.nursingRoomReport.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return { items };
  }

  @Post('nursing-rooms')
  async createNursingRoom(@Body() body: any) {
    return this.prisma.nursingRoomReport.create({
      data: {
        name: body.name,
        type: body.type ?? '기타',
        sido: body.sido,
        sigungu: body.sigungu ?? null,
        roadAddress: body.roadAddress,
        detailLocation: body.detailLocation ?? null,
        tel: body.tel ?? null,
        dadAvailable: body.dadAvailable ?? false,
        facilities: Array.isArray(body.facilities) ? body.facilities : [],
        openHours: body.openHours ?? null,
        notes: body.notes ?? null,
        reporterName: body.reporterName ?? null,
        lat: typeof body.lat === 'number' ? body.lat : null,
        lng: typeof body.lng === 'number' ? body.lng : null,
        status: body.status ?? 'APPROVED',
      },
    });
  }

  @Patch('nursing-rooms/:id')
  async updateNursingRoom(@Param('id') id: string, @Body() body: any) {
    return this.prisma.nursingRoomReport.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.sido !== undefined && { sido: body.sido }),
        ...(body.sigungu !== undefined && { sigungu: body.sigungu }),
        ...(body.roadAddress !== undefined && {
          roadAddress: body.roadAddress,
        }),
        ...(body.detailLocation !== undefined && {
          detailLocation: body.detailLocation,
        }),
        ...(body.tel !== undefined && { tel: body.tel }),
        ...(body.dadAvailable !== undefined && {
          dadAvailable: body.dadAvailable,
        }),
        ...(body.facilities !== undefined && { facilities: body.facilities }),
        ...(body.openHours !== undefined && { openHours: body.openHours }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.reporterName !== undefined && {
          reporterName: body.reporterName,
        }),
        ...(body.lat !== undefined && { lat: body.lat }),
        ...(body.lng !== undefined && { lng: body.lng }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
  }

  @Delete('nursing-rooms/:id')
  async deleteNursingRoom(@Param('id') id: string) {
    await this.prisma.nursingRoomReport.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Temperament =====
  @Get('temperament/questions')
  temperamentQuestions(@Query('ageGroup') ageGroup?: string) {
    const ag = (ageGroup as AgeGroup) || 'after_first';
    if (!VALID_AGE_GROUPS.includes(ag)) {
      throw new BadRequestException('유효하지 않은 ageGroup');
    }
    const dimMap = new Map(DIMENSIONS.map((d) => [d.key, d.label]));
    return {
      ageGroups: VALID_AGE_GROUPS.map((k) => ({
        key: k,
        label: AGE_GROUP_LABELS[k],
      })),
      ageGroup: ag,
      ageGroupLabel: AGE_GROUP_LABELS[ag],
      dimensions: DIMENSIONS,
      scale: SCALE,
      notice: NOTICE,
      questions: getQuestions(ag).map((q) => ({
        id: q.id,
        questionNo: q.questionNo,
        dimension: q.dimension,
        dimensionLabel: dimMap.get(q.dimension)!,
        text: q.text,
      })),
    };
  }

  @Get('temperament/results')
  temperamentResults(@Query('emotion') emotionStr?: string): any {
    const emotionModifier = emotionStr === '1' || emotionStr === 'true';
    return {
      dimensions: DIMENSIONS,
      scale: SCALE,
      emotionModifier,
      results: PRIMARY_TYPES.map(({ type, label }) => {
        const scores = buildPreviewScores(type, emotionModifier);
        const summary = buildSummary(type, label, emotionModifier);
        const freeContent = buildFreeContentByType(type);
        const paidContent = buildPaidContent(scores, type);
        return {
          primaryType: type,
          primaryTypeLabel: label,
          scores,
          summary,
          freeContent,
          paidContent,
        };
      }),
    };
  }
}
