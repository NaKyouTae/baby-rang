import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 앱이 미리 받아 두는 기간. 시작 전 광고도 이만큼 앞서 내려 이미지를 받아 둔다. */
const PREFETCH_MS = 7 * 86_400_000;

/**
 * 런치 광고 — 앱(로그인 여부와 상관없이)이 부른다.
 * 관리는 어드민(admin/launch-ads)에서 한다.
 */
@Controller('launch-ads')
export class LaunchAdsController {
  constructor(private prisma: PrismaService) {}

  /** 지금 걸려 있거나 곧 시작할 광고. 앱은 이 목록을 저장해 두고 다음 실행 때 쓴다. */
  @Get()
  async list() {
    const now = new Date();
    const items = await this.prisma.launchAd.findMany({
      where: {
        isActive: true,
        endsAt: { gt: now },
        startsAt: { lt: new Date(now.getTime() + PREFETCH_MS) },
      },
      orderBy: [{ startsAt: 'desc' }],
      select: {
        id: true,
        imageUrl: true,
        linkUrl: true,
        startsAt: true,
        endsAt: true,
        durationSec: true,
        maxPerDay: true,
      },
    });
    return { items, at: now };
  }

  /** 노출·클릭 집계. 실패해도 앱 동작에는 상관없다. */
  @Post(':id/events')
  async event(@Param('id') id: string, @Body() body: { type?: string }) {
    const field =
      body?.type === 'click'
        ? 'clicks'
        : body?.type === 'impression'
          ? 'impressions'
          : null;
    if (!field) return { ok: false };
    await this.prisma.launchAd
      .update({ where: { id }, data: { [field]: { increment: 1 } } })
      .catch(() => null);
    return { ok: true };
  }
}
