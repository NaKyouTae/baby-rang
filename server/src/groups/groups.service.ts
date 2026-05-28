import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// I/O/0/1 제외한 가독성 높은 문자 세트
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const dup = await tx.group.findUnique({ where: { code } });
    if (!dup) return code;
  }
  throw new InternalServerErrorException('failed to generate group code');
}

const MEMBER_USER_SELECT = {
  id: true,
  nickname: true,
  email: true,
  profileImage: true,
  parentRole: true,
} as const;

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 내가 속한 모든 그룹.
   * 각 그룹의 owner 여부, 코드, 멤버 목록, 아이 목록을 포함.
   */
  async listMyGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              orderBy: { joinedAt: 'asc' },
              include: { user: { select: MEMBER_USER_SELECT } },
            },
            children: {
              select: { id: true, name: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      code: m.group.code,
      isOwner: m.group.ownerId === userId,
      ownerId: m.group.ownerId,
      members: m.group.members.map((gm) => ({
        userId: gm.userId,
        joinedAt: gm.joinedAt,
        isOwner: gm.userId === m.group.ownerId,
        user: gm.user,
      })),
      children: m.group.children,
    }));
  }

  /**
   * 코드로 그룹 합류. 본인이 이미 멤버인 그룹은 거부.
   */
  async join(userId: string, code: string) {
    const group = await this.prisma.group.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: { where: { userId } } },
    });
    if (!group) {
      throw new NotFoundException('유효하지 않은 공유 코드입니다.');
    }
    if (group.members.length > 0) {
      throw new ConflictException('이미 이 그룹에 속해 있어요.');
    }

    await this.prisma.groupMember.create({
      data: { groupId: group.id, userId },
    });

    const childCount = await this.prisma.child.count({
      where: { groupId: group.id },
    });
    return { groupId: group.id, childCount };
  }

  /**
   * 멤버 추방 — owner만 가능. owner 자신은 추방 불가(나가기로만 가능).
   */
  async removeMember(userId: string, groupId: string, targetUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다.');
    if (group.ownerId !== userId) {
      throw new ForbiddenException('그룹 소유자만 멤버를 내보낼 수 있어요.');
    }
    if (group.ownerId === targetUserId) {
      throw new BadRequestException('소유자는 내보낼 수 없어요.');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!member) {
      throw new NotFoundException('해당 멤버를 찾을 수 없습니다.');
    }

    await this.prisma.groupMember.delete({ where: { id: member.id } });
    return { ok: true };
  }

  /**
   * 본인이 그룹에서 나가기.
   * - 본인이 owner이고 다른 멤버가 있으면: 가장 일찍 합류한 멤버에게 자동 이양 후 본인 빠짐
   * - 본인이 owner이고 마지막 멤버이면: 그룹 + 아이/기록 cascade 삭제
   * - 본인이 일반 멤버이면: 그냥 본인만 빠짐
   */
  async leave(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다.');

    const myMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!myMembership) {
      throw new NotFoundException('그룹의 멤버가 아니에요.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (group.ownerId === userId) {
        const successor = group.members[0];
        if (successor) {
          await tx.group.update({
            where: { id: groupId },
            data: { ownerId: successor.userId },
          });
          await tx.groupMember.delete({ where: { id: myMembership.id } });
        } else {
          // 마지막 멤버 — 그룹 + 아이/기록 cascade 삭제
          await tx.group.delete({ where: { id: groupId } });
        }
      } else {
        await tx.groupMember.delete({ where: { id: myMembership.id } });
      }
    });

    return { ok: true };
  }

  /**
   * 코드 재발급 — owner만 가능. 멤버십은 그대로 유지.
   */
  async regenerateCode(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다.');
    if (group.ownerId !== userId) {
      throw new ForbiddenException('그룹 소유자만 코드를 재발급할 수 있어요.');
    }

    return this.prisma.$transaction(async (tx) => {
      const code = await generateUniqueCode(tx);
      return tx.group.update({
        where: { id: groupId },
        data: { code },
        select: { id: true, code: true },
      });
    });
  }
}
