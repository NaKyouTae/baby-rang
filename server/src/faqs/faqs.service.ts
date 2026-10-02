import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 공개된 FAQ 를 분류 → 순서대로 돌려준다.
   *
   * 묶음(분류)은 프런트에서 배열 순서를 그대로 쓰므로 여기서 정렬을 끝낸다.
   * 같은 분류 안에서 order 가 같으면 먼저 등록한 것이 위로 온다.
   */
  async findPublished() {
    return this.prisma.faq.findMany({
      where: { isPublished: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        category: true,
        question: true,
        answer: true,
      },
      take: 200,
    });
  }
}
