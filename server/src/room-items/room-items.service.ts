import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomItemsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 꾸미기 화면에 보여줄 아이템.
   * 숨김(isActive=false) 처리된 것은 내려보내지 않는다 — 다만 이미 방에 놓인 가구는
   * 배치 데이터가 따로 들고 있으므로 목록에서 빠져도 방이 깨지지 않는다.
   */
  async findActive() {
    return this.prisma.roomItem.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }
}
