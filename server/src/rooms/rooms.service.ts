import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';

/**
 * 가로 타일 수 상한. 클라이언트가 화면 폭에 맞춰 배율을 정하므로
 * 기기에 따라 12~13칸 사이에서 움직인다. 넉넉히 둔다.
 */
const MAX_TILE_X = 16;
/**
 * 가로 타일 하한. 화면이 방(12칸)보다 조금 넓은 기기에서는 방 왼쪽 밖 여백에도 가구를 놓을 수 있어
 * 방 왼쪽 끝(0)보다 두 칸까지 왼쪽을 받는다.
 */
const MIN_TILE_X = -2;
/** 세로도 기기마다 보이는 높이가 달라 저장만 허용하는 상한을 둔다. */
const MAX_TILE_Y = 40;

/** 자리가 고정된 분류. 배치가 아니라 방의 속성이라 좌표를 받지 않는다. */
const FIXED_CATEGORIES = new Set(['WALLPAPER', 'FLOORING']);

/** 사용자가 고르는 크기 배율 상한. 정수만 받는다 — 픽셀이 고르게 늘어나야 한다. */
const MAX_SCALE = 3;

type PlacementInput = {
  itemId: string;
  tileX: number;
  tileY: number;
  flipX?: boolean;
  /** 정면 / 옆모습. 옆모습은 아이템에 옆모습 그림이 있을 때만. */
  facing?: 'FRONT' | 'SIDE';
  scale?: number;
  zOffset?: number;
};

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private children: ChildrenService,
  ) {}

  async find(userId: string, childId: string) {
    await this.children.assertAccess(userId, childId);
    const room = await this.prisma.room.findUnique({
      where: { childId },
      include: {
        // 놓은 순서 = 겹침 순서. 앱이 저장할 때 배열 위치를 zOffset 에 담는다.
        placements: {
          include: { item: true },
          orderBy: [{ zOffset: 'asc' }, { createdAt: 'asc' }],
        },
        wallpaper: true,
        flooring: true,
      },
    });
    // 아직 꾸민 적이 없으면 빈 방을 돌려준다. 여기서 행을 만들 이유는 없다.
    if (!room) return { room: null, placements: [], version: 0 };
    return {
      room: {
        id: room.id,
        wallpaper: room.wallpaper,
        flooring: room.flooring,
      },
      placements: room.placements,
      version: room.version,
    };
  }

  /**
   * 방 전체를 한 번에 덮어쓴다.
   *
   * 가구 하나씩 PATCH 하지 않고 통째로 받는다. 부분 수정은 순서가 꼬이기 쉽고,
   * 공동 양육자가 동시에 편집하는 경우도 version 하나로 막을 수 있다.
   */
  async replaceLayout(
    userId: string,
    childId: string,
    input: {
      version: number;
      wallpaperItemId?: string | null;
      flooringItemId?: string | null;
      placements: PlacementInput[];
    },
  ) {
    await this.children.assertAccess(userId, childId);

    const slotIds = [input.wallpaperItemId, input.flooringItemId].filter(
      (id): id is string => !!id,
    );
    const items = await this.prisma.roomItem.findMany({
      where: {
        id: {
          in: [
            ...new Set([...input.placements.map((p) => p.itemId), ...slotIds]),
          ],
        },
      },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const id of slotIds) {
      if (!byId.has(id))
        throw new BadRequestException('등록되지 않은 아이템이 있습니다.');
    }

    for (const p of input.placements) {
      const item = byId.get(p.itemId);
      if (!item)
        throw new BadRequestException('등록되지 않은 아이템이 있습니다.');
      if (FIXED_CATEGORIES.has(item.category)) {
        throw new BadRequestException(
          `'${item.name}' 은 자리가 고정된 분류라 놓는 게 아니라 바꾸는 것입니다.`,
        );
      }

      const scale = p.scale ?? 1;
      if (!Number.isInteger(scale) || scale < 1 || scale > MAX_SCALE) {
        throw new BadRequestException(
          `'${item.name}' 의 크기는 1~${MAX_SCALE}배만 고를 수 있습니다.`,
        );
      }
      const side = p.facing === 'SIDE';
      if (side && !item.sideImageUrl) {
        throw new BadRequestException(
          `'${item.name}' 은 옆모습이 없어 옆으로 놓을 수 없습니다.`,
        );
      }
      // 옆모습은 칸 수가 따로 있다. 정해 두지 않았으면 정면 칸 수를 가로·세로 바꿔 쓴다.
      const w = side ? (item.sideTileW ?? item.tileH) : item.tileW;
      const h = side ? (item.sideTileH ?? item.tileW) : item.tileH;
      if (p.tileX < MIN_TILE_X || p.tileX + w * scale > MAX_TILE_X) {
        throw new BadRequestException(`'${item.name}' 이 방 밖으로 나갑니다.`);
      }
      if (p.tileY < 0 || p.tileY + h * scale > MAX_TILE_Y) {
        throw new BadRequestException(
          `'${item.name}' 을 놓을 수 없는 자리입니다.`,
        );
      }

      // 겹침은 막지 않는다. 가구를 포개 놓는 건 꾸미는 사람의 선택이고,
      // 칸 단위로 밀어내면 오히려 사이가 크게 벌어진다.
    }

    const existing = await this.prisma.room.findUnique({
      where: { childId },
      include: { placements: { select: { itemId: true } } },
    });
    if (existing && existing.version !== input.version) {
      throw new BadRequestException(
        '다른 기기에서 방이 먼저 바뀌었습니다. 새로고침 후 다시 시도해 주세요.',
      );
    }

    await this.assertOwnsPaidItems(childId, input, byId, existing);

    return this.prisma.$transaction(async (tx) => {
      const room = existing
        ? await tx.room.update({
            where: { id: existing.id },
            data: {
              wallpaperItemId: input.wallpaperItemId ?? null,
              flooringItemId: input.flooringItemId ?? null,
              version: { increment: 1 },
            },
          })
        : await tx.room.create({
            data: {
              childId,
              wallpaperItemId: input.wallpaperItemId ?? null,
              flooringItemId: input.flooringItemId ?? null,
              version: 1,
            },
          });

      await tx.roomPlacement.deleteMany({ where: { roomId: room.id } });
      if (input.placements.length) {
        await tx.roomPlacement.createMany({
          data: input.placements.map((p) => ({
            roomId: room.id,
            itemId: p.itemId,
            tileX: p.tileX,
            tileY: p.tileY,
            flipX: p.flipX ?? false,
            facing: p.facing === 'SIDE' ? 'SIDE' : 'FRONT',
            scale: p.scale ?? 1,
            zOffset: p.zOffset ?? 0,
          })),
        });
      }
      return { ok: true, version: room.version };
    });
  }

  /**
   * 유료 아이템은 그룹이 보유해야 새로 놓을 수 있다.
   *
   * 앱이 들고 있는 카탈로그가 오래돼(시트를 연 뒤 어드민에서 유료로 바꾼 경우 등) 무료로 알고
   * 놓는 일이 있어 서버가 한 번 더 막는다.
   * 이미 이 방에 놓여 있던 것은 그대로 둔다 — 무료일 때 놓은 가구가 나중에 유료가 됐다고
   * 다른 가구를 옮긴 저장까지 막으면 안 된다. 그래서 '원래 있던 개수'를 넘는 것만 새로 놓은 것으로 본다.
   */
  private async assertOwnsPaidItems(
    childId: string,
    input: {
      wallpaperItemId?: string | null;
      flooringItemId?: string | null;
      placements: PlacementInput[];
    },
    byId: Map<string, { id: string; name: string; priceCoins: number }>,
    existing: {
      wallpaperItemId: string | null;
      flooringItemId: string | null;
      placements: { itemId: string }[];
    } | null,
  ) {
    const count = (ids: string[]) => {
      const m = new Map<string, number>();
      for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
      return m;
    };
    const before = count([
      ...(existing?.placements.map((p) => p.itemId) ?? []),
      ...[existing?.wallpaperItemId, existing?.flooringItemId].filter(
        (id): id is string => !!id,
      ),
    ]);
    const after = count([
      ...input.placements.map((p) => p.itemId),
      ...[input.wallpaperItemId, input.flooringItemId].filter(
        (id): id is string => !!id,
      ),
    ]);

    const added = [...after]
      .filter(([id, n]) => n > (before.get(id) ?? 0))
      .map(([id]) => byId.get(id))
      .filter(
        (item): item is NonNullable<typeof item> =>
          !!item && item.priceCoins > 0,
      );
    if (!added.length) return;

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { groupId: true },
    });
    const owned = new Set(
      (
        await this.prisma.roomItemOwnership.findMany({
          where: {
            groupId: child?.groupId ?? '',
            itemId: { in: added.map((i) => i.id) },
          },
          select: { itemId: true },
        })
      ).map((o) => o.itemId),
    );
    const missing = added.filter((i) => !owned.has(i.id));
    if (missing.length) {
      throw new BadRequestException(
        `${missing.map((i) => `'${i.name}'`).join(', ')} 은(는) 보석으로 구매해야 놓을 수 있는 아이템입니다. 구매 후 다시 저장해 주세요.`,
      );
    }
  }
}
