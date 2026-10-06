import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';

/**
 * 가로 타일 수 상한. 클라이언트가 화면 폭에 맞춰 배율을 정하므로
 * 기기에 따라 12~13칸 사이에서 움직인다. 넉넉히 둔다.
 */
const MAX_TILE_X = 16;
/** 세로도 기기마다 보이는 높이가 달라 저장만 허용하는 상한을 둔다. */
const MAX_TILE_Y = 40;

/** 자리가 고정된 분류. 배치가 아니라 방의 속성이라 좌표를 받지 않는다. */
const FIXED_CATEGORIES = new Set(['WALLPAPER', 'FLOORING']);

type PlacementInput = {
  itemId: string;
  tileX: number;
  tileY: number;
  direction?: string;
  flipX?: boolean;
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
        placements: { include: { item: true } },
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

    const items = await this.prisma.roomItem.findMany({
      where: {
        id: { in: [...new Set(input.placements.map((p) => p.itemId))] },
      },
    });
    const byId = new Map(items.map((i) => [i.id, i]));

    for (const p of input.placements) {
      const item = byId.get(p.itemId);
      if (!item)
        throw new BadRequestException('등록되지 않은 아이템이 있습니다.');
      if (FIXED_CATEGORIES.has(item.category)) {
        throw new BadRequestException(
          `'${item.name}' 은 자리가 고정된 분류라 놓는 게 아니라 바꾸는 것입니다.`,
        );
      }

      // 방향이 동/서면 가로·세로가 바뀐다
      const turned = p.direction === 'EAST' || p.direction === 'WEST';
      const w = turned ? item.tileH : item.tileW;
      const h = turned ? item.tileW : item.tileH;

      if (p.tileX < 0 || p.tileX + w > MAX_TILE_X) {
        throw new BadRequestException(`'${item.name}' 이 방 밖으로 나갑니다.`);
      }
      if (p.tileY < 0 || p.tileY + h > MAX_TILE_Y) {
        throw new BadRequestException(
          `'${item.name}' 을 놓을 수 없는 자리입니다.`,
        );
      }

      // 겹침은 막지 않는다. 가구를 포개 놓는 건 꾸미는 사람의 선택이고,
      // 칸 단위로 밀어내면 오히려 사이가 크게 벌어진다.
    }

    const existing = await this.prisma.room.findUnique({ where: { childId } });
    if (existing && existing.version !== input.version) {
      throw new BadRequestException(
        '다른 기기에서 방이 먼저 바뀌었습니다. 새로고침 후 다시 시도해 주세요.',
      );
    }

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
            direction: (p.direction ?? 'SOUTH') as never,
            flipX: p.flipX ?? false,
            zOffset: p.zOffset ?? 0,
          })),
        });
      }
      return { ok: true, version: room.version };
    });
  }
}
