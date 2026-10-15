import { Prisma } from '@prisma/client';

/** 회원가입 시 처음 쥐여주는 보석. */
export const SIGNUP_COINS = 10;
/** 육아 기록·성장 기록을 남기면 주는 보석. 그룹당 하루(KST) 한 번만 준다. */
export const RECORD_REWARD_COINS = 1;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 지금이 속한 KST 날짜의 00:00 을 UTC 시각으로. */
function startOfKstDay(now = new Date()) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - KST_OFFSET_MS);
}

/**
 * 그룹 생성 데이터에 붙이는 가입 보석.
 * 잔액과 원장을 같이 채워야 원장 합계와 Group.coins 가 어긋나지 않는다.
 */
export const signupCoins = {
  coins: SIGNUP_COINS,
  coinLedgers: { create: { delta: SIGNUP_COINS, reason: 'SIGNUP' } },
} satisfies Partial<Prisma.GroupCreateInput>;

/**
 * 기록 보상 적립. 기록을 만드는 트랜잭션 안에서 부른다 —
 * 따로 돌리면 기록은 남고 보석만 빠지거나 그 반대가 생긴다.
 * 오늘(KST) 이미 받은 그룹이면 아무것도 하지 않는다.
 */
export async function rewardRecord(
  tx: Prisma.TransactionClient,
  childId: string,
) {
  const child = await tx.child.findUnique({
    where: { id: childId },
    select: { groupId: true },
  });
  if (!child) return;
  // 공동 양육자가 동시에 기록하면 둘 다 '오늘 아직 안 받음'을 보고 두 번 줄 수 있다.
  // 그룹 단위로 잠가 확인과 적립을 한 덩어리로 만든다. 잠금은 트랜잭션이 끝나면 풀린다.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'coin-reward:' + child.groupId}))`;
  const already = await tx.coinLedger.findFirst({
    where: {
      groupId: child.groupId,
      reason: 'REWARD',
      createdAt: { gte: startOfKstDay() },
    },
    select: { id: true },
  });
  if (already) return;
  await tx.coinLedger.create({
    data: {
      groupId: child.groupId,
      delta: RECORD_REWARD_COINS,
      reason: 'REWARD',
    },
  });
  await tx.group.update({
    where: { id: child.groupId },
    data: { coins: { increment: RECORD_REWARD_COINS } },
  });
}
