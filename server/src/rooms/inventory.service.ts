import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import {
  COIN_PRODUCT_TYPES,
  coinsFor,
  listCoinPacks,
} from '../payments/product-catalog';

/**
 * 꾸미기 아이템 보유와 구매.
 *
 * 보유는 아이가 아니라 '그룹'이 갖는다. 공동 양육자가 같은 아이템을 또 살 이유가 없고,
 * 둘째가 태어나도 가구를 다시 사게 하면 안 된다.
 */
/** 구매 내역에 같이 보여주는 보상 원장 사유. 'SIGNUP' 은 가입 보석, 'REWARD' 는 하루 한 번 기록 보상. */
const REWARD_REASONS = ['SIGNUP', 'REWARD'] as const;

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private children: ChildrenService,
  ) {}

  /** 아이가 속한 그룹. 접근 권한 검사도 같이 한다. */
  private async groupOf(userId: string, childId: string) {
    await this.children.assertAccess(userId, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { groupId: true },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');
    return child.groupId;
  }

  /** 충전 상품 목록. 가격과 수량은 서버 카탈로그가 정한다. */
  coinPacks() {
    return { packs: listCoinPacks() };
  }

  /**
   * 결제된 충전분을 재화로 반영한다.
   *
   * 결제 확정 경로가 토스·앱스토어·플레이로 셋이라 각 경로에 적립을 끼워 넣으면
   * 한 곳만 빠져도 돈을 받고 보석을 안 주는 사고가 난다. 그래서 잔액을 읽을 때
   * 아직 원장에 없는 결제를 찾아 메운다 — 몇 번 돌려도 결과가 같고, 경로가 늘어도
   * 고칠 데가 없다.
   */
  private async reconcile(groupId: string) {
    const childIds = (
      await this.prisma.child.findMany({
        where: { groupId },
        select: { id: true },
      })
    ).map((c) => c.id);
    if (!childIds.length) return;

    const paid = await this.prisma.payment.findMany({
      where: {
        childId: { in: childIds },
        status: 'PAID',
        productType: { in: COIN_PRODUCT_TYPES },
      },
      select: { id: true, productType: true },
    });
    if (!paid.length) return;

    const done = new Set(
      (
        await this.prisma.coinLedger.findMany({
          where: { paymentId: { in: paid.map((p) => p.id) } },
          select: { paymentId: true },
        })
      ).map((l) => l.paymentId),
    );

    for (const payment of paid) {
      if (done.has(payment.id)) continue;
      const coins = coinsFor(payment.productType);
      if (coins <= 0) continue;
      try {
        await this.prisma.$transaction([
          this.prisma.coinLedger.create({
            data: {
              groupId,
              delta: coins,
              reason: 'PURCHASE',
              paymentId: payment.id,
            },
          }),
          this.prisma.group.update({
            where: { id: groupId },
            data: { coins: { increment: coins } },
          }),
        ]);
      } catch {
        // paymentId 유니크 충돌 = 다른 요청이 먼저 적립했다. 그대로 두면 된다.
      }
    }
  }

  async find(userId: string, childId: string) {
    const groupId = await this.groupOf(userId, childId);
    await this.reconcile(groupId);
    const [group, owned] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: { coins: true },
      }),
      this.prisma.roomItemOwnership.findMany({
        where: { groupId },
        select: { itemId: true },
      }),
    ]);
    return {
      coins: group?.coins ?? 0,
      ownedItemIds: owned.map((o) => o.itemId),
    };
  }

  /**
   * 아이템 구매.
   *
   * 잔액 확인부터 차감·보유 등록까지 한 트랜잭션에서 한다. 따로 하면
   * 두 기기에서 동시에 눌렀을 때 잔액보다 많이 살 수 있다.
   */
  async purchase(userId: string, childId: string, itemId: string) {
    const groupId = await this.groupOf(userId, childId);

    const item = await this.prisma.roomItem.findUnique({
      where: { id: itemId },
    });
    if (!item || !item.isActive) {
      throw new NotFoundException('판매 중인 아이템이 아닙니다.');
    }
    const price = item.priceCoins;
    if (price <= 0) {
      throw new BadRequestException('무료 아이템이라 구매할 필요가 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const already = await tx.roomItemOwnership.findUnique({
        where: { groupId_itemId: { groupId, itemId } },
      });
      if (already) throw new BadRequestException('이미 보유한 아이템입니다.');

      const group = await tx.group.findUnique({
        where: { id: groupId },
        select: { coins: true },
      });
      const coins = group?.coins ?? 0;
      if (coins < price) {
        throw new BadRequestException(`보석이 ${price - coins}개 모자랍니다.`);
      }

      const updated = await tx.group.update({
        where: { id: groupId },
        data: { coins: { decrement: price } },
        select: { coins: true },
      });
      await tx.roomItemOwnership.create({
        data: { groupId, itemId, pricePaid: price },
      });
      await tx.coinLedger.create({
        data: { groupId, delta: -price, reason: 'SPEND', itemId },
      });

      const owned = await tx.roomItemOwnership.findMany({
        where: { groupId },
        select: { itemId: true },
      });
      return { coins: updated.coins, ownedItemIds: owned.map((o) => o.itemId) };
    });
  }

  /**
   * 보석 충전 내역.
   *
   * 원장이 아니라 결제를 읽는다. 원장의 충전 행은 reconcile 이 뒤늦게 메우기도 하고
   * 결제 금액(원)을 들고 있지 않아 "2,400원" 을 보여줄 수 없다.
   */
  async chargeHistory(
    userId: string,
    childId: string,
    take: number,
    skip: number,
    includeRewards = false,
  ) {
    const groupId = await this.groupOf(userId, childId);
    const childIds = (
      await this.prisma.child.findMany({
        where: { groupId },
        select: { id: true },
      })
    ).map((c) => c.id);

    const paymentWhere = {
      childId: { in: childIds },
      status: 'PAID' as const,
      productType: { in: COIN_PRODUCT_TYPES },
    };
    // 가입 보상(SIGNUP)과 기록 보상(REWARD)도 '받은 보석'이라 구매 내역에 같이 보여준다.
    const rewardWhere = {
      groupId,
      reason: { in: [...REWARD_REASONS] },
    };
    // 두 출처를 시간순으로 섞어 자르므로, 각각 skip + take 만큼 읽어 합친 뒤 자른다.
    const window = skip + take;
    const [payments, paymentTotal, rewards, rewardTotal] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where: paymentWhere,
          orderBy: { createdAt: 'desc' },
          take: includeRewards ? window : take,
          skip: includeRewards ? 0 : skip,
          select: {
            id: true,
            productType: true,
            amount: true,
            approvedAt: true,
            createdAt: true,
          },
        }),
        this.prisma.payment.count({ where: paymentWhere }),
        this.prisma.coinLedger.findMany({
          where: includeRewards ? rewardWhere : { id: { in: [] } },
          orderBy: { createdAt: 'desc' },
          take: window,
          select: { id: true, delta: true, reason: true, createdAt: true },
        }),
        this.prisma.coinLedger.count({
          where: includeRewards ? rewardWhere : { id: { in: [] } },
        }),
      ]);

    const purchaseItems = payments.map((r) => ({
      id: r.id,
      kind: 'PURCHASE' as const,
      coins: coinsFor(r.productType),
      amount: r.amount,
      at: r.approvedAt ?? r.createdAt,
    }));
    if (!includeRewards) {
      return { items: purchaseItems, total: paymentTotal, take, skip };
    }

    const rewardItems = rewards.map((r) => ({
      id: r.id,
      kind: r.reason as (typeof REWARD_REASONS)[number],
      coins: r.delta,
      amount: null,
      at: r.createdAt,
    }));
    const items = [...purchaseItems, ...rewardItems]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(skip, skip + take);

    return { items, total: paymentTotal + rewardTotal, take, skip };
  }

  /** 보석 사용 내역. 원장에서 음수 행만 읽는다. */
  async spendHistory(
    userId: string,
    childId: string,
    take: number,
    skip: number,
  ) {
    const groupId = await this.groupOf(userId, childId);
    const where = { groupId, delta: { lt: 0 } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.coinLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: { id: true, delta: true, itemId: true, createdAt: true },
      }),
      this.prisma.coinLedger.count({ where }),
    ]);

    // 아이템 이름은 원장에 없다 — 카탈로그에서 이번 페이지에 보이는 것만 가져온다.
    const itemIds = [...new Set(rows.map((r) => r.itemId).filter(Boolean))];
    const names = new Map(
      (
        await this.prisma.roomItem.findMany({
          where: { id: { in: itemIds as string[] } },
          select: { id: true, name: true },
        })
      ).map((i) => [i.id, i.name]),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: (r.itemId && names.get(r.itemId)) || '아이템',
        coins: Math.abs(r.delta),
        at: r.createdAt,
      })),
      total,
      take,
      skip,
    };
  }
}
