/**
 * 로컬 기능 확인용 샘플 데이터.
 *
 * 실행: pnpm --filter server seed:local
 * 로그인: toss-review / BabyRang2026!
 *
 * 운영 DB 오염을 막기 위해 DATABASE_URL 호스트가 localhost/127.0.0.1일 때만 실행한다.
 * 재실행 시 [local-sample] 표식이 있는 데이터만 교체한다.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  PrismaClient,
  RoomItem as RoomItemModel,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL이 설정되지 않았습니다.');
const databaseHost = new URL(databaseUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
  throw new Error(
    `로컬 DB에서만 실행할 수 있습니다. 현재 호스트: ${databaseHost}`,
  );
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const SAMPLE = '[local-sample]';
const TEST_PROVIDER_ID = 'test-toss-review';
const SHARE_PARTNER_PROVIDER_ID = 'test-local-share-partner';

function kstDate(daysAgo: number, hour = 0, minute = 0) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  kst.setUTCDate(kst.getUTCDate() - daysAgo);
  return new Date(
    kst.getTime() -
      9 * 60 * 60 * 1000 +
      hour * 60 * 60 * 1000 +
      minute * 60_000,
  );
}

async function createTestUser() {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerId: { provider: 'KAKAO', providerId: TEST_PROVIDER_ID },
    },
    select: { userId: true },
  });
  if (account)
    return prisma.user.findUniqueOrThrow({ where: { id: account.userId } });

  const now = new Date();
  return prisma.user.create({
    data: {
      name: '로컬 테스트 계정',
      phone: '01000000000',
      parentRole: 'mom',
      onboardedAt: now,
      termsAgreedAt: now,
      privacyAgreedAt: now,
      accounts: { create: { provider: 'KAKAO', providerId: TEST_PROVIDER_ID } },
    },
  });
}

async function createGroup(userId: string) {
  let group = await prisma.group.findFirst({ where: { ownerId: userId } });
  if (group) return group;

  const code = `LOCAL${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  group = await prisma.group.create({
    data: {
      ownerId: userId,
      code,
      coins: 10,
      members: { create: { userId } },
      coinLedgers: { create: { delta: 10, reason: 'SIGNUP' } },
    },
  });
  return group;
}

async function seed() {
  const user = await createTestUser();
  const group = await createGroup(user.id);

  const child = await prisma.child.upsert({
    where: {
      id:
        (
          await prisma.child.findFirst({
            where: { groupId: group.id, name: '샘플 아기' },
            select: { id: true },
          })
        )?.id ?? randomUUID(),
    },
    create: {
      groupId: group.id,
      name: '샘플 아기',
      gender: 'female',
      birthDate: kstDate(210),
      dueDate: kstDate(196),
    },
    update: {
      gender: 'female',
      birthDate: kstDate(210),
      dueDate: kstDate(196),
    },
  });

  const secondChild = await prisma.child.upsert({
    where: {
      id:
        (
          await prisma.child.findFirst({
            where: { groupId: group.id, name: '둘째 샘플' },
            select: { id: true },
          })
        )?.id ?? randomUUID(),
    },
    create: {
      groupId: group.id,
      name: '둘째 샘플',
      gender: 'male',
      birthDate: kstDate(35),
    },
    update: { gender: 'male', birthDate: kstDate(35) },
  });

  await prisma.growthRecord.deleteMany({
    where: { childId: child.id, memo: { startsWith: SAMPLE } },
  });
  const records: Array<{
    userId: string;
    childId: string;
    type: string;
    startAt: Date;
    endAt: Date | null;
    memo: string;
    data: object;
  }> = [];
  for (let day = 29; day >= 0; day--) {
    const offset = day % 3;
    const add = (
      hour: number,
      minute: number,
      type: string,
      data: object,
      duration?: number,
      memo = '',
    ) => {
      const startAt = kstDate(day, hour, minute + offset * 4);
      records.push({
        userId: user.id,
        childId: child.id,
        type,
        startAt,
        endAt: duration
          ? new Date(startAt.getTime() + duration * 60_000)
          : null,
        memo: `${SAMPLE}${memo ? ` ${memo}` : ''}`,
        data,
      });
    };
    add(
      2,
      20,
      'BREASTFEEDING',
      { leftMin: 8 + (day % 4), rightMin: 7 + (day % 5) },
      16,
    );
    add(6, 50, 'FORMULA', { amountMl: 120 + (day % 4) * 30 });
    add(8, 15, 'DIAPER', {
      kind: day % 3 === 0 ? 'BOTH' : day % 2 ? 'PEE' : 'POO',
    });
    add(9, 35, 'BABY_FOOD', {
      menu: day % 2 ? '소고기 채소죽' : '단호박 미음',
      amount: 75 + (day % 4) * 10,
      amountUnit: 'ml',
    });
    add(10, 25, 'SLEEP', { kind: 'NAP' }, 55 + (day % 3) * 15);
    add(12, 10, 'PUMPED_FEEDING', { amountMl: 90 + (day % 5) * 20 });
    add(14, 5, 'PUMPING', {
      leftMl: 55 + (day % 4) * 10,
      rightMl: 50 + (day % 3) * 10,
    });
    add(15, 30, 'DIAPER', { kind: day % 2 ? 'PEE' : 'BOTH' });
    add(16, 20, 'SLEEP', { kind: 'NAP' }, 40 + (day % 4) * 10);
    add(18, 0, 'BABY_FOOD', {
      menu: '닭고기 브로콜리죽',
      amount: 95 + (day % 3) * 10,
      amountUnit: 'ml',
    });
    add(19, 45, 'FORMULA', { amountMl: 150 + (day % 3) * 30 });
    add(21, 10, 'SLEEP', { kind: 'NIGHT' }, 480 + (day % 4) * 20);
  }
  // 오늘 진행 중인 수면을 하나 추가해 종료 동작도 확인할 수 있게 한다.
  addCurrentSleep(records, user.id, child.id);
  await prisma.growthRecord.createMany({ data: records as never[] });

  await prisma.recentRecordAmount.deleteMany({ where: { childId: child.id } });
  await prisma.recentRecordAmount.createMany({
    data: [
      ...[210, 180, 150, 120, 90].map((value, i) => ({
        childId: child.id,
        type: 'FORMULA' as const,
        value,
        unit: 'ml',
        lastUsedAt: kstDate(i),
      })),
      ...[160, 140, 120, 100, 80].map((value, i) => ({
        childId: child.id,
        type: 'PUMPED_FEEDING' as const,
        value,
        unit: 'ml',
        lastUsedAt: kstDate(i),
      })),
      ...[80, 70, 60, 50, 40].map((value, i) => ({
        childId: child.id,
        type: 'PUMPING' as const,
        value,
        unit: 'ml',
        lastUsedAt: kstDate(i),
      })),
      ...[150, 130, 110, 90, 70].map((value, i) => ({
        childId: child.id,
        type: 'BABY_FOOD' as const,
        value,
        unit: 'ml',
        lastUsedAt: kstDate(i),
      })),
    ],
  });

  await prisma.physicalGrowth.deleteMany({
    where: { childId: child.id, memo: { startsWith: SAMPLE } },
  });
  await prisma.physicalGrowth.deleteMany({
    where: { childId: secondChild.id, memo: { startsWith: SAMPLE } },
  });
  await prisma.physicalGrowth.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      userId: user.id,
      childId: child.id,
      measuredAt: kstDate(210 - i * 30),
      heightCm: 48.5 + i * 3.05,
      weightKg: 3.2 + i * 0.82,
      headCircumCm: 34 + i * 1.18,
      memo: `${SAMPLE} 월간 성장 기록`,
    })),
  });
  await prisma.physicalGrowth.createMany({
    data: [
      {
        userId: user.id,
        childId: secondChild.id,
        measuredAt: kstDate(3),
        heightCm: 54.2,
        weightKg: 4.6,
        headCircumCm: 37.1,
        memo: `${SAMPLE} 둘째 성장 기록`,
      },
    ],
    skipDuplicates: true,
  });

  await seedRoom(group.id, child.id);
  await seedPaymentsAndCoins(user.id, group.id, child.id);
  const sharePartnerId = await seedSharing(user.id, group.id);
  const additionalAccounts = await seedOtherLocalAccounts(user.id, sharePartnerId);
  await seedNotices();
  console.log(
    `로컬 샘플 데이터 적용 완료: ${user.name} / ${child.name}, 육아 기록 ${records.length}건, 성장 기록 9건`,
  );
  console.log(
    '로그인: toss-review / BabyRang2026! (앱 개발 서버의 테스트 로그인 경로)',
  );
  console.log(`기존 로컬 계정에도 공유·결제 샘플 적용: ${additionalAccounts}개 계정`);
}

/** 기록 공유 화면에서 내 공유와 받은 공유 목록을 모두 확인할 수 있게 한다. */
async function seedSharing(userId: string, ownGroupId: string): Promise<string> {
  let partner = await prisma.user.findFirst({
    where: {
      accounts: {
        some: {
          provider: 'KAKAO',
          providerId: SHARE_PARTNER_PROVIDER_ID,
        },
      },
    },
  });
  if (!partner) {
    partner = await prisma.user.create({
      data: {
        name: '공유 샘플 보호자',
        phone: '01000000001',
        parentRole: 'dad',
        onboardedAt: new Date(),
        termsAgreedAt: new Date(),
        privacyAgreedAt: new Date(),
        accounts: {
          create: {
            provider: 'KAKAO',
            providerId: SHARE_PARTNER_PROVIDER_ID,
          },
        },
      },
    });
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: ownGroupId, userId: partner.id } },
    create: { groupId: ownGroupId, userId: partner.id },
    update: {},
  });

  let partnerGroup = await prisma.group.findFirst({
    where: { ownerId: partner.id },
  });
  if (!partnerGroup) {
    partnerGroup = await prisma.group.create({
      data: {
        ownerId: partner.id,
        code: `SHARE${randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`,
        members: { create: { userId: partner.id } },
      },
    });
  }
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: partnerGroup.id, userId } },
    create: { groupId: partnerGroup.id, userId },
    update: {},
  });

  const existingChild = await prisma.child.findFirst({
    where: { groupId: partnerGroup.id, name: '공유 샘플 아기' },
    select: { id: true },
  });
  if (!existingChild) {
    await prisma.child.create({
      data: {
        groupId: partnerGroup.id,
        name: '공유 샘플 아기',
        gender: 'male',
        birthDate: kstDate(90),
      },
    });
  }
  return partner.id;
}

/**
 * 샘플은 화면별로 사용자 ID를 기준으로 조회된다. 로그인 계정마다 샘플이 보이도록
 * 로컬 DB의 기존 그룹 소유 계정에도 공유·구매 샘플을 넣는다.
 */
async function seedOtherLocalAccounts(
  primaryUserId: string,
  sharePartnerId: string,
) {
  const users = await prisma.user.findMany({
    where: { id: { notIn: [primaryUserId, sharePartnerId] } },
    orderBy: { createdAt: 'asc' },
    include: {
      ownedGroups: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: {
          children: { orderBy: { createdAt: 'asc' }, take: 1 },
        },
      },
    },
  });

  let seeded = 0;
  for (const user of users) {
    const group = user.ownedGroups[0];
    const child = group?.children[0];
    if (!group || !child) continue;
    await seedPaymentsAndCoins(user.id, group.id, child.id);
    await seedSharing(user.id, group.id);
    seeded++;
  }
  return seeded;
}

/** 공지 목록과 안 읽은 표시를 로컬에서 확인할 수 있는 샘플 공지. */
async function seedNotices() {
  await prisma.notice.deleteMany({
    where: { title: { startsWith: '[샘플]' } },
  });
  await prisma.notice.createMany({
    data: [
      {
        title: '[샘플] 아기랑 업데이트 안내',
        content:
          '기록 화면과 성장 페이지가 새롭게 개선되었습니다. 최신 버전에서 달라진 기능을 확인해 주세요.',
        isPinned: true,
        isPublished: true,
        publishedAt: kstDate(1, 10),
      },
      {
        title: '[샘플] 보석함 이용 안내',
        content:
          '보석은 아기방 꾸미기 아이템을 구매할 때 사용할 수 있습니다. 구매 및 사용 내역은 보석함에서 확인할 수 있어요.',
        isPinned: false,
        isPublished: true,
        publishedAt: kstDate(3, 10),
      },
      {
        title: '[샘플] 기록 공유 기능 안내',
        content:
          '공유 코드로 가족을 초대하면 아기의 기록을 함께 확인하고 관리할 수 있습니다.',
        isPinned: false,
        isPublished: true,
        publishedAt: kstDate(7, 10),
      },
    ],
  });
}

function addCurrentSleep(
  records: Array<{
    userId: string;
    childId: string;
    type: string;
    startAt: Date;
    endAt: Date | null;
    memo: string;
    data: object;
  }>,
  userId: string,
  childId: string,
) {
  const startAt = new Date(Date.now() - 18 * 60_000);
  records.push({
    userId,
    childId,
    type: 'SLEEP',
    startAt,
    endAt: null,
    memo: `${SAMPLE} 진행 중 수면`,
    data: { kind: 'NAP' },
  });
}

async function seedRoom(groupId: string, childId: string) {
  const definitions: Prisma.RoomItemCreateInput[] = [
    {
      spriteKey: 'local-sample-bed',
      name: '샘플 아기침대',
      category: 'BED',
      surface: 'FLOOR',
      tileW: 3,
      tileH: 2,
      priceCoins: 0,
      imageUrl: '/icons/act-sleep.svg',
      affordances: ['HOLD', 'SLEEP'],
    },
    {
      spriteKey: 'local-sample-sofa',
      name: '샘플 소파',
      category: 'FURNITURE',
      surface: 'FLOOR',
      tileW: 3,
      tileH: 2,
      priceCoins: 30,
      imageUrl: null,
      affordances: ['HOLD', 'SEAT'],
    },
    {
      spriteKey: 'local-sample-rug',
      name: '샘플 놀이 러그',
      category: 'RUG',
      surface: 'FLOOR',
      tileW: 4,
      tileH: 2,
      priceCoins: 20,
      imageUrl: '/room/default-flooring.webp',
      affordances: ['SOFT_FLOOR'],
    },
    {
      spriteKey: 'local-sample-toy',
      name: '샘플 장난감',
      category: 'TOY',
      surface: 'FLOOR',
      tileW: 1,
      tileH: 1,
      priceCoins: 15,
      imageUrl: '/icons/act-babyfood.svg',
      affordances: ['PLAY'],
    },
    {
      spriteKey: 'local-sample-decor',
      name: '샘플 소품',
      category: 'DECOR',
      surface: 'ON_TOP',
      tileW: 1,
      tileH: 1,
      priceCoins: 3,
      imageUrl: '/icons/gem.svg',
      affordances: [],
    },
    {
      spriteKey: 'local-sample-wallpaper',
      name: '샘플 벽지',
      category: 'WALLPAPER',
      surface: 'WALL',
      tileW: 1,
      tileH: 1,
      priceCoins: 25,
      imageUrl: '/room/default-wallpaper.png',
      affordances: [],
    },
    {
      spriteKey: 'local-sample-flooring',
      name: '샘플 바닥재',
      category: 'FLOORING',
      surface: 'FLOOR',
      tileW: 1,
      tileH: 1,
      priceCoins: 20,
      imageUrl: '/room/default-flooring.webp',
      affordances: [],
    },
  ];
  const items: RoomItemModel[] = [];
  for (const item of definitions) {
    items.push(
      await prisma.roomItem.upsert({
        where: { spriteKey: item.spriteKey },
        create: item,
        update: item,
      }),
    );
  }
  const [bed, sofa, rug, toy, wallpaper, flooring] = items;

  await prisma.roomItemOwnership.deleteMany({
    where: { groupId, item: { spriteKey: { startsWith: 'local-sample-' } } },
  });
  await prisma.roomItemOwnership.createMany({
    data: [
      { groupId, itemId: bed.id, pricePaid: 0 },
      { groupId, itemId: rug.id, pricePaid: 20 },
    ],
    skipDuplicates: true,
  });
  const room = await prisma.room.upsert({
    where: { childId },
    create: {
      childId,
      wallpaperItemId: wallpaper.id,
      flooringItemId: flooring.id,
      version: 1,
    },
    update: {
      wallpaperItemId: wallpaper.id,
      flooringItemId: flooring.id,
      version: { increment: 1 },
    },
  });
  await prisma.roomPlacement.deleteMany({ where: { roomId: room.id } });
  await prisma.roomPlacement.createMany({
    data: [
      { roomId: room.id, itemId: rug.id, tileX: 1, tileY: 10, zOffset: 0 },
      { roomId: room.id, itemId: bed.id, tileX: 2, tileY: 6, zOffset: 1 },
      { roomId: room.id, itemId: sofa.id, tileX: 7, tileY: 7, zOffset: 2 },
      { roomId: room.id, itemId: toy.id, tileX: 10, tileY: 10, zOffset: 3 },
    ],
  });
}

async function seedPaymentsAndCoins(
  userId: string,
  groupId: string,
  childId: string,
) {
  const sampleOrderPrefix = `LOCAL-SAMPLE-${userId.slice(0, 8)}-`;
  const oldPayments = await prisma.payment.findMany({
    where: { userId, orderId: { startsWith: 'LOCAL-SAMPLE-' } },
    select: { id: true },
  });
  const oldPaymentIds = oldPayments.map((p) => p.id);
  await prisma.coinLedger.deleteMany({
    where: {
      groupId,
      OR: [{ reason: 'LOCAL_SAMPLE' }, { paymentId: { in: oldPaymentIds } }],
    },
  });
  await prisma.payment.deleteMany({ where: { id: { in: oldPaymentIds } } });
  const paid = [
    {
      orderId: `${sampleOrderPrefix}COINS20`,
      type: 'COINS_20' as const,
      name: '보석 20개',
      amount: 2400,
      coins: 22,
      date: kstDate(12),
    },
    {
      orderId: `${sampleOrderPrefix}COINS50`,
      type: 'COINS_50' as const,
      name: '보석 50개',
      amount: 6000,
      coins: 50,
      date: kstDate(4),
    },
  ];
  for (const p of paid) {
    const payment = await prisma.payment.create({
      data: {
        userId,
        childId,
        orderId: p.orderId,
        productType: p.type,
        productName: p.name,
        amount: p.amount,
        provider: 'LOCAL_SAMPLE',
        method: 'SAMPLE',
        status: 'PAID',
        requestedAt: p.date,
        approvedAt: p.date,
        createdAt: p.date,
        events: {
          create: {
            type: 'CONFIRMED',
            status: 'PAID',
            amount: p.amount,
            createdAt: p.date,
          },
        },
      },
    });
    await prisma.coinLedger.create({
      data: {
        groupId,
        delta: p.coins,
        reason: 'LOCAL_SAMPLE',
        paymentId: payment.id,
        createdAt: p.date,
      },
    });
  }
  const failedAt = kstDate(2);
  await prisma.payment.create({
    data: {
      userId,
      childId,
      orderId: `${sampleOrderPrefix}FAILED`,
      productType: 'COINS_10',
      productName: '보석 10개',
      amount: 1200,
      provider: 'LOCAL_SAMPLE',
      method: 'SAMPLE',
      status: 'FAILED',
      failureCode: 'SAMPLE_FAILURE',
      failureMessage: '샘플 결제 실패 기록',
      requestedAt: failedAt,
      createdAt: failedAt,
      events: {
        create: {
          type: 'FAILED',
          status: 'FAILED',
          amount: 1200,
          reason: '샘플 결제 실패',
          createdAt: failedAt,
        },
      },
    },
  });

  await prisma.coinLedger.create({
    data: {
      groupId,
      delta: -20,
      reason: 'LOCAL_SAMPLE',
      itemId: (
        await prisma.roomItem.findUniqueOrThrow({
          where: { spriteKey: 'local-sample-rug' },
        })
      ).id,
      createdAt: kstDate(3),
    },
  });
  await prisma.coinLedger.create({
    data: {
      groupId,
      delta: -30,
      reason: 'LOCAL_SAMPLE',
      itemId: (
        await prisma.roomItem.findUniqueOrThrow({
          where: { spriteKey: 'local-sample-sofa' },
        })
      ).id,
      createdAt: kstDate(1),
    },
  });
  const total = await prisma.coinLedger.aggregate({
    where: { groupId },
    _sum: { delta: true },
  });
  await prisma.group.update({
    where: { id: groupId },
    data: { coins: total._sum.delta ?? 0 },
  });
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
