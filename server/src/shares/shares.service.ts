import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class SharesService {
  constructor(private prisma: PrismaService) {}

  /** 공유 코드 생성 (아이당 1개) */
  async create(ownerId: string, childId: string) {
    // 본인 소유 아이인지 확인
    const child = await this.prisma.child.findFirst({
      where: { id: childId, userId: ownerId },
    });
    if (!child) throw new NotFoundException('아이를 찾을 수 없습니다.');

    // 이미 공유 코드가 있는지 확인
    const existing = await this.prisma.childShare.findUnique({
      where: { childId_ownerId: { childId, ownerId } },
      include: { members: { include: { user: { select: { id: true, nickname: true, profileImage: true } } } } },
    });
    if (existing) return existing;

    // 유니크한 코드 생성
    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const dup = await this.prisma.childShare.findUnique({ where: { code } });
      if (!dup) break;
      code = generateCode();
    }

    return this.prisma.childShare.create({
      data: { childId, ownerId, code },
      include: { members: { include: { user: { select: { id: true, nickname: true, profileImage: true } } } } },
    });
  }

  /** 내가 만든 공유 목록 */
  async findOwned(ownerId: string) {
    return this.prisma.childShare.findMany({
      where: { ownerId },
      include: {
        child: { select: { id: true, name: true, gender: true, birthDate: true, profileImage: true } },
        members: { include: { user: { select: { id: true, nickname: true, profileImage: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** 내가 참여 중인 공유 목록 */
  async findJoined(userId: string) {
    const memberships = await this.prisma.childShareMember.findMany({
      where: { userId },
      include: {
        share: {
          include: {
            child: { select: { id: true, name: true, gender: true, birthDate: true, profileImage: true } },
            owner: { select: { id: true, nickname: true, profileImage: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships;
  }

  /** 코드 입력하여 공유 참여 */
  async join(userId: string, code: string) {
    const share = await this.prisma.childShare.findUnique({
      where: { code: code.toUpperCase() },
      include: { child: { select: { id: true, name: true, profileImage: true } } },
    });
    if (!share || !share.isActive) {
      throw new NotFoundException('유효하지 않은 공유 코드입니다.');
    }

    // 본인이 소유자면 참여 불가
    if (share.ownerId === userId) {
      throw new BadRequestException('본인이 만든 공유에는 참여할 수 없습니다.');
    }

    // 이미 참여 중인지 확인
    const existing = await this.prisma.childShareMember.findUnique({
      where: { shareId_userId: { shareId: share.id, userId } },
    });
    if (existing) throw new ConflictException('이미 참여 중인 공유입니다.');

    await this.prisma.childShareMember.create({
      data: { shareId: share.id, userId },
    });

    return { childName: share.child.name };
  }

  /** 멤버 내보내기 (소유자) 또는 나가기 (본인) */
  async removeMember(userId: string, shareId: string, memberId: string) {
    const share = await this.prisma.childShare.findUnique({
      where: { id: shareId },
    });
    if (!share) throw new NotFoundException('공유를 찾을 수 없습니다.');

    const member = await this.prisma.childShareMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.shareId !== shareId) {
      throw new NotFoundException('멤버를 찾을 수 없습니다.');
    }

    // 소유자이거나 본인만 삭제 가능
    if (share.ownerId !== userId && member.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.prisma.childShareMember.delete({ where: { id: memberId } });
    return { ok: true };
  }

  /** 공유 삭제 (소유자만) */
  async remove(userId: string, shareId: string) {
    const share = await this.prisma.childShare.findFirst({
      where: { id: shareId, ownerId: userId },
    });
    if (!share) throw new NotFoundException('공유를 찾을 수 없습니다.');

    await this.prisma.childShare.delete({ where: { id: shareId } });
    return { ok: true };
  }

  /** 코드 재발급 (소유자만) */
  async regenerate(userId: string, shareId: string) {
    const share = await this.prisma.childShare.findFirst({
      where: { id: shareId, ownerId: userId },
    });
    if (!share) throw new NotFoundException('공유를 찾을 수 없습니다.');

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const dup = await this.prisma.childShare.findUnique({ where: { code } });
      if (!dup) break;
      code = generateCode();
    }

    return this.prisma.childShare.update({
      where: { id: shareId },
      data: { code },
    });
  }
}
