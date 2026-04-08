import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  async findPublished() {
    return this.prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || !notice.isPublished) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    return notice;
  }
}
