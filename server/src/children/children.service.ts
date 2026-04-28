import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SharesService } from '../shares/shares.service';

/**
 * 'YYYY-MM-DD' 또는 ISO 문자열을 받아 해당 날짜의 UTC 정오 Date로 변환.
 * 서버/DB timezone에 관계없이 날짜 부분이 -1/+1일 어긋나지 않도록 정오로 고정한다.
 */
function toBirthDate(input: string): Date {
  const ymd = input.slice(0, 10);
  return new Date(`${ymd}T12:00:00.000Z`);
}

@Injectable()
export class ChildrenService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private sharesService: SharesService,
  ) {}

  async findAll(userId: string) {
    // 내 아이 목록
    const ownChildren = await this.prisma.child.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // 공유받은 아이 목록 (SharedAccess 기반)
    const sharedAccess = await this.prisma.sharedAccess.findMany({
      where: { grantedToId: userId },
      include: {
        child: true,
        sharedBy: { select: { nickname: true } },
      },
    });

    const sharedChildren = sharedAccess.map((a) => ({
      ...a.child,
      isShared: true,
      ownerNickname: a.sharedBy.nickname,
    }));

    return [
      ...ownChildren.map((c) => ({ ...c, isShared: false })),
      ...sharedChildren,
    ];
  }

  async create(
    userId: string,
    name: string,
    gender: string,
    birthDate: string,
    file?: Express.Multer.File,
    dueDate?: string,
  ) {
    let profileImage: string | undefined;
    if (file) {
      profileImage = await this.storage.upload(file, 'children');
    }

    const child = await this.prisma.child.create({
      data: {
        userId,
        name,
        gender,
        birthDate: toBirthDate(birthDate),
        dueDate: dueDate ? toBirthDate(dueDate) : null,
        profileImage,
      },
    });

    // 기존 공유 멤버에게 자동으로 새 아이 접근 권한 추가
    await this.sharesService.autoShareNewChild(userId, child.id);

    return child;
  }

  async update(
    userId: string,
    childId: string,
    name: string,
    gender: string,
    birthDate: string,
    file?: Express.Multer.File,
    dueDate?: string,
  ) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, userId },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');

    let profileImage = child.profileImage;
    if (file) {
      if (child.profileImage) {
        await this.storage.delete(child.profileImage);
      }
      profileImage = await this.storage.upload(file, 'children');
    }

    return this.prisma.child.update({
      where: { id: childId },
      data: {
        name,
        gender,
        birthDate: toBirthDate(birthDate),
        dueDate:
          dueDate !== undefined
            ? dueDate
              ? toBirthDate(dueDate)
              : null
            : undefined,
        profileImage,
      },
    });
  }

  async remove(userId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, userId },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');

    if (child.profileImage) {
      await this.storage.delete(child.profileImage);
    }

    return this.prisma.child.delete({ where: { id: childId } });
  }

  async removeProfileImage(userId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, userId },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');

    if (child.profileImage) {
      await this.storage.delete(child.profileImage);
    }

    return this.prisma.child.update({
      where: { id: childId },
      data: { profileImage: null },
    });
  }
}
