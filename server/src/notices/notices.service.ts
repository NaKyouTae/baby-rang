import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  async findPublished() {
    return this.prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 100,
    });
  }

  async findOne(id: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || !notice.isPublished) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    return notice;
  }

  async markAsRead(userId: string, noticeId: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id: noticeId },
    });
    if (!notice || !notice.isPublished) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    await this.prisma.noticeRead.upsert({
      where: { userId_noticeId: { userId, noticeId } },
      create: { userId, noticeId },
      update: {},
    });
  }

  async hasUnread(userId: string): Promise<boolean> {
    // 독립적인 두 COUNT를 병렬 실행 (홈 진입마다 호출됨)
    const [totalPublished, totalRead] = await Promise.all([
      this.prisma.notice.count({ where: { isPublished: true } }),
      this.prisma.noticeRead.count({
        where: { userId, notice: { isPublished: true } },
      }),
    ]);
    return totalRead < totalPublished;
  }
}
