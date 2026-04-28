import {
  BadRequestException,
  ConflictException,
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

  /** 내 공유 코드 조회 (없으면 자동 생성) */
  async getOrCreateCode(userId: string) {
    const existing = await this.prisma.shareCode.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const dup = await this.prisma.shareCode.findUnique({ where: { code } });
      if (!dup) break;
      code = generateCode();
    }

    return this.prisma.shareCode.create({
      data: { userId, code },
    });
  }

  /** 내 공유 정보 (코드 + 공유받은 사람들 목록) */
  async findMyShare(userId: string) {
    const shareCode = await this.getOrCreateCode(userId);

    // 내가 공유한 접근 권한 목록 (내가 sharedBy인 것)
    const accessList = await this.prisma.sharedAccess.findMany({
      where: { sharedById: userId },
      include: {
        grantedTo: { select: { id: true, nickname: true, profileImage: true } },
        child: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 멤버별로 그룹핑
    const memberMap = new Map<
      string,
      {
        user: {
          id: string;
          nickname: string | null;
          profileImage: string | null;
        };
        children: { id: string; name: string }[];
        accessIds: string[];
      }
    >();

    for (const access of accessList) {
      const uid = access.grantedToId;
      if (!memberMap.has(uid)) {
        memberMap.set(uid, {
          user: access.grantedTo,
          children: [],
          accessIds: [],
        });
      }
      const entry = memberMap.get(uid)!;
      entry.children.push({ id: access.child.id, name: access.child.name });
      entry.accessIds.push(access.id);
    }

    return {
      code: shareCode.code,
      members: Array.from(memberMap.values()),
    };
  }

  /** 내가 공유받은 아이 목록 */
  async findSharedWithMe(userId: string) {
    const accessList = await this.prisma.sharedAccess.findMany({
      where: { grantedToId: userId },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            profileImage: true,
          },
        },
        sharedBy: { select: { id: true, nickname: true, profileImage: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return accessList.map((a) => ({
      id: a.id,
      role: a.role,
      child: a.child,
      sharedBy: a.sharedBy,
    }));
  }

  /** 코드 입력하여 공유 참여 → 코드 주인이 접근 가능한 모든 아이에 대해 SharedAccess 생성 */
  async join(userId: string, code: string) {
    const shareCode = await this.prisma.shareCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { user: { select: { id: true, nickname: true } } },
    });
    if (!shareCode) {
      throw new NotFoundException('유효하지 않은 공유 코드입니다.');
    }

    const codeOwnerId = shareCode.userId;

    // 본인 코드면 참여 불가
    if (codeOwnerId === userId) {
      throw new BadRequestException('본인의 공유 코드에는 참여할 수 없습니다.');
    }

    // 코드 주인이 접근 가능한 모든 아이 = 직접 등록한 아이 + 공유받은 아이
    const ownChildren = await this.prisma.child.findMany({
      where: { userId: codeOwnerId },
      select: { id: true, name: true },
    });

    const sharedChildren = await this.prisma.sharedAccess.findMany({
      where: { grantedToId: codeOwnerId },
      select: { childId: true, child: { select: { name: true } } },
    });

    const allChildIds = [
      ...ownChildren.map((c) => c.id),
      ...sharedChildren.map((s) => s.childId),
    ];

    if (allChildIds.length === 0) {
      throw new BadRequestException('공유할 아이가 없습니다.');
    }

    // 이미 접근 권한이 있는 아이 제외
    const existingAccess = await this.prisma.sharedAccess.findMany({
      where: { grantedToId: userId, childId: { in: allChildIds } },
      select: { childId: true },
    });
    const existingChildIds = new Set(existingAccess.map((a) => a.childId));
    const newChildIds = allChildIds.filter((id) => !existingChildIds.has(id));

    if (newChildIds.length === 0) {
      throw new ConflictException('이미 모든 아이의 기록을 공유받고 있습니다.');
    }

    // SharedAccess 일괄 생성
    await this.prisma.sharedAccess.createMany({
      data: newChildIds.map((childId) => ({
        childId,
        grantedToId: userId,
        sharedById: codeOwnerId,
        role: 'editor',
      })),
    });

    const childNames = [
      ...ownChildren
        .filter((c) => newChildIds.includes(c.id))
        .map((c) => c.name),
      ...sharedChildren
        .filter((s) => newChildIds.includes(s.childId))
        .map((s) => s.child.name),
    ];

    return { childNames, count: newChildIds.length };
  }

  /** 공유 멤버 제거 (특정 사용자의 모든 접근 권한 삭제) */
  async removeMember(userId: string, targetUserId: string) {
    // 내가 공유한 접근 권한 중 targetUserId의 것만 삭제
    const accessList = await this.prisma.sharedAccess.findMany({
      where: { sharedById: userId, grantedToId: targetUserId },
    });

    if (accessList.length === 0) {
      throw new NotFoundException('해당 멤버를 찾을 수 없습니다.');
    }

    await this.prisma.sharedAccess.deleteMany({
      where: { sharedById: userId, grantedToId: targetUserId },
    });

    return { ok: true };
  }

  /** 공유 나가기 (내가 받은 특정 공유 삭제) */
  async leaveAccess(userId: string, accessId: string) {
    const access = await this.prisma.sharedAccess.findUnique({
      where: { id: accessId },
    });
    if (!access || access.grantedToId !== userId) {
      throw new NotFoundException('공유를 찾을 수 없습니다.');
    }

    await this.prisma.sharedAccess.delete({ where: { id: accessId } });
    return { ok: true };
  }

  /** 코드 재발급 */
  async regenerate(userId: string) {
    const existing = await this.prisma.shareCode.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException('공유 코드를 찾을 수 없습니다.');

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const dup = await this.prisma.shareCode.findUnique({ where: { code } });
      if (!dup) break;
      code = generateCode();
    }

    return this.prisma.shareCode.update({
      where: { userId },
      data: { code },
    });
  }

  /** 아이 등록 시 기존 공유 멤버에게 자동으로 접근 권한 추가 */
  async autoShareNewChild(ownerId: string, childId: string) {
    // 내가 직접 공유한(sharedBy) 사람들 조회
    const existingAccess = await this.prisma.sharedAccess.findMany({
      where: { sharedById: ownerId },
      select: { grantedToId: true },
    });

    const uniqueGrantedIds = [
      ...new Set(existingAccess.map((a) => a.grantedToId)),
    ];

    if (uniqueGrantedIds.length === 0) return;

    await this.prisma.sharedAccess.createMany({
      data: uniqueGrantedIds.map((grantedToId) => ({
        childId,
        grantedToId,
        sharedById: ownerId,
        role: 'editor',
      })),
      skipDuplicates: true,
    });
  }
}
