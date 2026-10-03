import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChildrenService } from '../children/children.service';

/** 방의 논리 크기(타일). 클라이언트의 tiles.ts 와 같은 값이어야 한다. */
const ROOM_W_TILES = 12;
/** 위에서 몇 줄이 벽인가. 바닥 가구는 이 아래로만 놓을 수 있다. */
const WALL_TILES = 8;
/** 세로는 기기마다 보이는 높이가 달라, 저장만 허용하는 넉넉한 상한을 둔다. */
const MAX_TILE_Y = 40;

/** 러그·바닥재는 밟고 지나가는 것이라 다른 가구와 겹쳐도 된다. */
const FLAT_CATEGORIES = new Set(['RUG', 'FLOORING']);

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
      include: { placements: { include: { item: true } }, roomItem: true },
    });
    // 아직 꾸민 적이 없으면 빈 방을 돌려준다. 여기서 행을 만들 이유는 없다.
    if (!room) return { room: null, placements: [], version: 0 };
    return {
      room: { id: room.id, roomItem: room.roomItem },
      placements: room.placements,
      version: room.version,
    };
  }

  /**
   * 방 전체를 한 번에 덮어쓴다.
   *
   * 가구 하나씩 PATCH 하지 않는 이유는 겹침 검사 때문이다. 겹침은 방 전체를
   * 봐야 알 수 있어서, 부분 수정마다 전체를 다시 검사하느니 통째로 받는 편이 낫다.
   * 공동 양육자가 동시에 편집하는 경우도 version 하나로 막을 수 있다.
   */
  async replaceLayout(
    userId: string,
    childId: string,
    input: {
      version: number;
      roomItemId?: string | null;
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

    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const p of input.placements) {
      const item = byId.get(p.itemId);
      if (!item)
        throw new BadRequestException('등록되지 않은 아이템이 있습니다.');
      if (item.category === 'ROOM') {
        throw new BadRequestException(
          '방 타입은 배치가 아니라 방 배경으로 지정합니다.',
        );
      }

      // 방향이 동/서면 가로·세로가 바뀐다
      const turned = p.direction === 'EAST' || p.direction === 'WEST';
      const w = turned ? item.tileH : item.tileW;
      const h = turned ? item.tileW : item.tileH;

      if (p.tileX < 0 || p.tileX + w > ROOM_W_TILES) {
        throw new BadRequestException(`'${item.name}' 이 방 밖으로 나갑니다.`);
      }
      if (p.tileY < WALL_TILES || p.tileY + h > MAX_TILE_Y) {
        throw new BadRequestException(
          `'${item.name}' 을 놓을 수 없는 자리입니다.`,
        );
      }

      if (FLAT_CATEGORIES.has(item.category)) continue;

      const box = {
        x0: p.tileX,
        y0: p.tileY,
        x1: p.tileX + w,
        y1: p.tileY + h,
      };
      for (const other of boxes) {
        const overlap =
          box.x0 < other.x1 &&
          other.x0 < box.x1 &&
          box.y0 < other.y1 &&
          other.y0 < box.y1;
        if (overlap)
          throw new BadRequestException(
            `'${item.name}' 이 다른 가구와 겹칩니다.`,
          );
      }
      boxes.push(box);
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
              roomItemId: input.roomItemId ?? null,
              version: { increment: 1 },
            },
          })
        : await tx.room.create({
            data: { childId, roomItemId: input.roomItemId ?? null, version: 1 },
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
