import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

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
  ) {}

  /** 사용자가 속한 모든 그룹의 모든 아이 — 그룹 단위로 라벨링 */
  async findAll(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      include: {
        group: {
          include: {
            children: { orderBy: { createdAt: 'asc' } },
            owner: { select: { id: true, nickname: true } },
          },
        },
      },
    });

    return memberships.flatMap((m) =>
      m.group.children.map((c) => ({
        ...c,
        groupId: m.groupId,
        isShared: m.group.ownerId !== userId,
        ownerNickname:
          m.group.ownerId === userId ? null : m.group.owner.nickname,
      })),
    );
  }

  /**
   * 권한 체크: 사용자가 child의 그룹 멤버인지.
   * 권한 없으면 NotFound로 통일(존재 자체를 숨김).
   */
  async assertAccess(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { groupId: true },
    });
    if (!child) throw new NotFoundException('아기를 찾을 수 없습니다.');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: child.groupId, userId } },
    });
    if (!membership) throw new NotFoundException('아기를 찾을 수 없습니다.');
    return child;
  }

  /**
   * 아기 등록 — 어느 그룹에 추가할지 명시. 미지정 시 본인의 1인 그룹(=내가 owner인 그룹 중 가장 처음 만들어진 것).
   * 그룹의 멤버여야 추가 가능.
   */
  async create(
    userId: string,
    name: string,
    gender: string,
    birthDate: string,
    file?: Express.Multer.File,
    dueDate?: string,
    groupId?: string,
  ) {
    const targetGroupId = await this.resolveGroupId(userId, groupId);

    let profileImage: string | undefined;
    if (file) {
      profileImage = await this.storage.upload(file, 'children');
    }

    return this.prisma.child.create({
      data: {
        groupId: targetGroupId,
        name,
        gender,
        birthDate: toBirthDate(birthDate),
        dueDate: dueDate ? toBirthDate(dueDate) : null,
        profileImage,
      },
    });
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
    await this.assertAccess(userId, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) throw new NotFoundException('아기를 찾을 수 없습니다.');

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

  /**
   * 아기 삭제 — 그룹 owner만 가능 (공동 양육 데이터를 일반 멤버가 일방 삭제하지 못하게).
   */
  async remove(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { group: { select: { ownerId: true } } },
    });
    if (!child) throw new NotFoundException('아기를 찾을 수 없습니다.');
    if (child.group.ownerId !== userId) {
      throw new ForbiddenException('아기 삭제는 그룹 소유자만 할 수 있어요.');
    }

    if (child.profileImage) {
      await this.storage.delete(child.profileImage);
    }
    return this.prisma.child.delete({ where: { id: childId } });
  }

  async removeProfileImage(userId: string, childId: string) {
    await this.assertAccess(userId, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });
    if (!child) throw new NotFoundException('아기를 찾을 수 없습니다.');

    if (child.profileImage) {
      await this.storage.delete(child.profileImage);
    }

    return this.prisma.child.update({
      where: { id: childId },
      data: { profileImage: null },
    });
  }

  /**
   * groupId가 명시되면 사용자가 그 그룹의 멤버인지 검증.
   * 명시 안 되면 사용자가 owner인 가장 처음 만들어진 그룹(보통 1인 그룹) 사용.
   */
  private async resolveGroupId(
    userId: string,
    groupId?: string,
  ): Promise<string> {
    if (groupId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException('그룹의 멤버가 아니에요.');
      }
      return groupId;
    }
    const ownGroup = await this.prisma.group.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!ownGroup) {
      // 회원가입 시 자동 생성되므로 이론상 도달 X.
      throw new NotFoundException('사용자의 그룹을 찾을 수 없습니다.');
    }
    return ownGroup.id;
  }
}
