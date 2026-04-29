/**
 * 성장 패턴 화면 확인용 시드 스크립트
 * - 등록된 모든 아기에 대해 최근 4주(28일)치 GrowthRecord 생성
 * - 매일 17개 모든 타입이 한 번 이상 등장하도록 배치
 *
 * 실행: pnpm --filter server exec ts-node prisma/seed-growth-pattern.ts
 *      (또는) cd server && npx ts-node prisma/seed-growth-pattern.ts
 */
import { PrismaClient, GrowthRecordType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Slot = {
  type: GrowthRecordType;
  startMin: number; // 0~1439 (해당 일의 분)
  durationMin?: number; // 있으면 endAt 생성
  data?: Record<string, unknown>;
  memo?: string;
};

// 하루 24시간 안에 17개 타입을 모두 배치 (시간 순)
function buildDailySlots(dayIndex: number): Slot[] {
  // dayIndex별로 살짝 흔들어 자연스럽게
  const j = (n: number) => ((dayIndex * 13 + n * 7) % 31) - 15; // -15~15분 흔들림
  return [
    // 새벽 수유
    {
      type: 'BREASTFEEDING',
      startMin: 3 * 60 + j(1),
      durationMin: 20,
      data: { leftMin: 10, rightMin: 10 },
    },
    {
      type: 'DIAPER',
      startMin: 3 * 60 + 25 + j(2),
      data: { kind: 'PEE' },
    },
    // 아침
    {
      type: 'TEMPERATURE',
      startMin: 7 * 60 + j(4),
      data: { celsius: (36.5 + ((dayIndex % 5) * 0.1)).toFixed(1) },
    },
    {
      type: 'FORMULA',
      startMin: 7 * 60 + 30 + j(5),
      durationMin: 15,
      data: { amountMl: 120 + (dayIndex % 4) * 10 },
    },
    {
      type: 'MEDICATION',
      startMin: 8 * 60 + 10 + j(6),
      data: { name: '비타민D', dose: '0.5ml' },
    },
    {
      type: 'BABY_FOOD',
      startMin: 9 * 60 + j(7),
      data: { menu: '소고기야채죽', amountG: 80 },
    },
    {
      type: 'TUMMY_TIME',
      startMin: 9 * 60 + 40 + j(8),
      durationMin: 15,
    },
    // 오전 낮잠
    {
      type: 'SLEEP',
      startMin: 10 * 60 + j(9),
      durationMin: 60 + j(10),
      data: { kind: 'NAP' },
    },
    {
      type: 'WATER',
      startMin: 11 * 60 + 20 + j(11),
      data: { amountMl: 30 },
    },
    {
      type: 'PUMPING',
      startMin: 11 * 60 + 40 + j(12),
      durationMin: 15,
      data: { leftMl: 60, rightMl: 70 },
    },
    // 점심 무렵
    {
      type: 'PUMPED_FEEDING',
      startMin: 12 * 60 + j(13),
      durationMin: 15,
      data: { amountMl: 130 },
    },
    {
      type: 'DIAPER',
      startMin: 12 * 60 + 30 + j(14),
      data: { kind: 'BOTH' },
    },
    {
      type: 'PLAY',
      startMin: 13 * 60 + j(15),
      durationMin: 40,
    },
    // 오후 낮잠
    {
      type: 'SLEEP',
      startMin: 14 * 60 + j(16),
      durationMin: 90 + j(17),
      data: { kind: 'NAP' },
    },
    {
      type: 'SNACK',
      startMin: 16 * 60 + j(18),
      data: { menu: '바나나', amountG: 30 },
    },
    {
      type: 'MILK',
      startMin: 16 * 60 + 30 + j(19),
      data: { amountMl: 100 },
    },
    // 저녁
    {
      type: 'BABY_FOOD',
      startMin: 18 * 60 + j(20),
      data: { menu: '닭고기죽', amountG: 90 },
    },
    {
      type: 'BATH',
      startMin: 19 * 60 + j(21),
    },
    {
      type: 'HOSPITAL',
      // 일주일에 한 번 정도만 체감되도록
      startMin: 17 * 60 + j(22),
      data: { hospital: '아기랑소아과', diagnosis: '예방접종' },
    },
    {
      type: 'ETC',
      startMin: 20 * 60 + j(23),
      memo: '오늘의 메모',
    },
    // 잠들기 전 마지막 수유
    {
      type: 'FORMULA',
      startMin: 21 * 60 + j(24),
      durationMin: 15,
      data: { amountMl: 150 },
    },
    {
      type: 'DIAPER',
      startMin: 21 * 60 + 30 + j(25),
      data: { kind: 'POO' },
    },
    // 밤잠: 22시 ~ 다음날 06:30 (자정 넘어가는 단일 레코드)
    {
      type: 'SLEEP',
      startMin: 22 * 60 + j(26),
      durationMin: 8 * 60 + 30, // 약 8시간 30분
      data: { kind: 'NIGHT' },
    },
  ];
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// KST 기준 해당 날짜의 0시를 UTC Date로 변환
function kstDayStart(dateStr: string): Date {
  // dateStr = YYYY-MM-DD (KST 기준)
  // KST 0시 = UTC 전날 15시
  return new Date(`${dateStr}T00:00:00+09:00`);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  // 주의: getUTC* 사용 시 KST→UTC로 인한 날짜 어긋남 가능. 안전히 별도 처리:
}

// 위 shiftDate가 시간대 이슈로 어긋날 수 있어 KST 기준 안전 버전으로 교체
function shiftDateKST(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

function todayKSTDateStr(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

async function seedForChild(childId: string, userId: string) {
  const today = todayKSTDateStr();
  const startDate = shiftDateKST(today, -27); // 28일 (오늘 포함)

  // 기존 28일치 패턴 시드 중복 방지: 동일 기간 기존 데이터 삭제는 위험하니
  // 메모 prefix로 식별 가능한 시드만 정리
  const from = kstDayStart(startDate);
  const to = new Date(kstDayStart(today).getTime() + 24 * 60 * 60 * 1000);
  await prisma.growthRecord.deleteMany({
    where: {
      childId,
      startAt: { gte: from, lt: to },
      memo: { startsWith: '[seed]' },
    },
  });

  const rows: Array<{
    userId: string;
    childId: string;
    type: GrowthRecordType;
    startAt: Date;
    endAt: Date | null;
    memo: string | null;
    data: any;
  }> = [];

  for (let i = 0; i < 28; i++) {
    const dateStr = shiftDateKST(startDate, i);
    const dayStart = kstDayStart(dateStr).getTime();
    const slots = buildDailySlots(i);
    for (const s of slots) {
      const startAt = new Date(dayStart + s.startMin * 60_000);
      const endAt = s.durationMin
        ? new Date(dayStart + (s.startMin + s.durationMin) * 60_000)
        : null;
      rows.push({
        userId,
        childId,
        type: s.type,
        startAt,
        endAt,
        memo: `[seed] ${s.memo ?? ''}`.trim(),
        data: s.data ?? null,
      });
    }
  }

  await prisma.growthRecord.createMany({ data: rows });
  return rows.length;
}

async function main() {
  const children = await prisma.child.findMany({
    select: { id: true, userId: true, name: true },
  });
  if (children.length === 0) {
    console.log('등록된 아기가 없습니다. 먼저 아기를 등록해 주세요.');
    return;
  }
  for (const c of children) {
    const n = await seedForChild(c.id, c.userId);
    console.log(`✓ ${c.name} (${c.id}) — ${n}건 생성`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
