import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';
import { startOfKstDay } from '../coins/coin-rewards';

/** 광고 한 편을 끝까지 보면 주는 보석. */
export const AD_REWARD_COINS = 1;
/** 그룹당 하루(KST) 광고 보상 횟수. */
export const AD_REWARD_DAILY_LIMIT = 3;

/**
 * 보석을 줄 수 있는 보상형 광고 단위(AdMob 광고 단위 ID 의 '/' 뒤 숫자).
 * SSV 콜백의 ad_unit 이 여기 없으면 주지 않는다 — 같은 계정의 다른 앱·단위 콜백이
 * 이 주소로 잘못 설정돼도 보석이 새지 않게.
 */
const AD_UNITS = new Set([
  '9205023206', // iOS 보석함 보상형
  '1670148112', // AOS 보석함 보상형
]);

/** SSV 콜백 쿼리에서 지급에 쓰는 값. */
export interface SsvCallback {
  adUnit: string;
  customData: string;
  transactionId: string;
  userId: string;
}

/**
 * 보상형 광고로 보석 받기.
 *
 * 1. 앱이 광고를 띄우기 전에 start() 로 시청 건(AdReward)을 만든다. 한도도 여기서 먼저 본다.
 * 2. 네이티브가 그 id 를 custom_data 로 실어 광고를 띄운다.
 * 3. 끝까지 보면 AdMob 이 서버로 서명된 콜백을 보내고, grant() 가 보석을 준다.
 * 4. 앱은 status() 를 몇 번 물어 지급됐는지 확인한다.
 */
@Injectable()
export class AdRewardsService {
  private readonly logger = new Logger(AdRewardsService.name);

  constructor(
    private prisma: PrismaService,
    private children: ChildrenService,
  ) {}

  private async groupOf(userId: string, childId: string) {
    await this.children.assertAccess(userId, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { groupId: true },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');
    return child.groupId;
  }

  private rewardedToday(
    db: Prisma.TransactionClient | PrismaService,
    groupId: string,
  ) {
    return db.adReward.count({
      where: {
        groupId,
        status: 'REWARDED',
        rewardedAt: { gte: startOfKstDay() },
      },
    });
  }

  /** 오늘 남은 횟수. 보석함이 버튼 옆에 보여준다. */
  async quota(userId: string, childId: string) {
    const groupId = await this.groupOf(userId, childId);
    const used = await this.rewardedToday(this.prisma, groupId);
    return {
      limit: AD_REWARD_DAILY_LIMIT,
      remaining: Math.max(0, AD_REWARD_DAILY_LIMIT - used),
    };
  }

  /**
   * 광고를 띄우기 전에 시청 건을 만든다. 돌려준 id 를 custom_data, userId 를 user_id 로
   * 광고 요청에 실어야 지급된다.
   */
  async start(userId: string, childId: string) {
    const groupId = await this.groupOf(userId, childId);
    const used = await this.rewardedToday(this.prisma, groupId);
    if (used >= AD_REWARD_DAILY_LIMIT) {
      throw new BadRequestException('오늘 받을 수 있는 보석을 모두 받았어요.');
    }
    // 광고를 띄우다 만 건은 PENDING 으로 남는다. 버튼을 연타해 행만 쌓는 걸 막는다.
    const startedToday = await this.prisma.adReward.count({
      where: { groupId, createdAt: { gte: startOfKstDay() } },
    });
    if (startedToday >= AD_REWARD_DAILY_LIMIT * 6) {
      throw new BadRequestException('잠시 후 다시 시도해 주세요.');
    }
    const reward = await this.prisma.adReward.create({
      data: { groupId, userId },
      select: { id: true },
    });
    return {
      id: reward.id,
      userId,
      remaining: AD_REWARD_DAILY_LIMIT - used,
    };
  }

  /** 시청 건의 지급 여부. 본인이 만든 건만 볼 수 있다. */
  async status(userId: string, id: string) {
    const reward = await this.prisma.adReward.findFirst({
      where: { id, userId },
      select: { status: true },
    });
    if (!reward) throw new NotFoundException();
    return { status: reward.status };
  }

  /**
   * SSV 콜백으로 보석을 준다. 서명 검증은 호출하는 쪽(컨트롤러)이 먼저 끝낸다.
   *
   * 같은 콜백이 다시 와도(AdMob 재시도) 한 번만 준다 — 시청 건이 PENDING 일 때만
   * 바꾸고, transactionId 에 유니크가 걸려 있다.
   */
  async grant(cb: SsvCallback) {
    if (!AD_UNITS.has(cb.adUnit)) {
      this.logger.warn(`허용하지 않은 광고 단위: ${cb.adUnit}`);
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const reward = await tx.adReward.findUnique({
          where: { id: cb.customData },
        });
        if (!reward) {
          this.logger.warn(`모르는 시청 건: ${cb.customData}`);
          return;
        }
        if (reward.status !== 'PENDING') return;
        // 앱이 user_id 에 시청 건을 만든 사람을 싣는다. 다르면 남의 시청 건 id 를 가져다 쓴 것이다.
        if (cb.userId && cb.userId !== reward.userId) {
          this.logger.warn(`시청 건 소유자 불일치: ${cb.customData}`);
          return;
        }

        // 공동 양육자가 동시에 받으면 둘 다 한도 안으로 볼 수 있다. 기록 보상과 같은 잠금을 쓴다.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'coin-reward:' + reward.groupId}))`;
        const used = await this.rewardedToday(tx, reward.groupId);
        if (used >= AD_REWARD_DAILY_LIMIT) {
          await tx.adReward.update({
            where: { id: reward.id },
            data: { status: 'LIMITED', transactionId: cb.transactionId },
          });
          return;
        }

        await tx.adReward.update({
          where: { id: reward.id },
          data: {
            status: 'REWARDED',
            transactionId: cb.transactionId,
            rewardedAt: new Date(),
          },
        });
        await tx.coinLedger.create({
          data: {
            groupId: reward.groupId,
            delta: AD_REWARD_COINS,
            reason: 'AD_REWARD',
          },
        });
        await tx.group.update({
          where: { id: reward.groupId },
          data: { coins: { increment: AD_REWARD_COINS } },
        });
      });
    } catch (err) {
      // transactionId 유니크 충돌 = 같은 시청이 이미 처리됐다.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }
  }
}
