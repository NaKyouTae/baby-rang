import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../admin/admin.guard';
import { RoomsService } from './rooms.service';

/** 어드민이 사용자 방을 앱 화면 그대로 보는 데 쓰는 티켓의 종류와 수명 */
const TICKET_TYPE = 'room-view';
const TICKET_TTL = '30m';

/**
 * 어드민의 '아기방' 메뉴.
 *
 * 방은 앱이 그리는 코드 그대로 보여 주려고 앱의 읽기 전용 페이지(/room-view)를 띄운다.
 * 앱은 어드민 토큰을 모르므로, 어드민이 아이 하나에 대한 짧은 티켓을 받아 앱에 넘긴다.
 * 티켓에는 sub 가 없어 일반 API 인증(JwtStrategy)에는 쓸 수 없다.
 */
@Controller('room-view')
export class RoomViewController {
  constructor(
    private prisma: PrismaService,
    private rooms: RoomsService,
    private jwt: JwtService,
  ) {}

  /** 꾸민 방 목록. 최근에 바꾼 방부터. */
  @Get()
  @UseGuards(AdminGuard)
  async list() {
    const rooms = await this.prisma.room.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        updatedAt: true,
        createdAt: true,
        wallpaper: { select: { name: true } },
        flooring: { select: { name: true } },
        _count: { select: { placements: true } },
        child: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            group: {
              select: {
                owner: { select: { id: true, name: true, email: true } },
                _count: { select: { members: true } },
              },
            },
          },
        },
      },
    });
    return {
      items: rooms.map((r) => ({
        childId: r.child.id,
        childName: r.child.name,
        gender: r.child.gender,
        birthDate: r.child.birthDate,
        owner: r.child.group?.owner ?? null,
        memberCount: r.child.group?._count.members ?? 0,
        placements: r._count.placements,
        wallpaper: r.wallpaper?.name ?? null,
        flooring: r.flooring?.name ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  @Post(':childId/ticket')
  @UseGuards(AdminGuard)
  async ticket(@Param('childId') childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true },
    });
    if (!child) throw new NotFoundException();
    const ticket = await this.jwt.signAsync(
      { type: TICKET_TYPE, childId },
      { expiresIn: TICKET_TTL },
    );
    return { ticket };
  }

  /** 앱의 /room-view 가 부른다. 티켓만 확인하고 방과 아이 정보를 돌려준다. */
  @Get(':childId')
  async view(
    @Param('childId') childId: string,
    @Query('ticket') ticket?: string,
  ) {
    let payload: { type?: string; childId?: string };
    try {
      payload = await this.jwt.verifyAsync(ticket ?? '');
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.type !== TICKET_TYPE || payload.childId !== childId) {
      throw new UnauthorizedException();
    }
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, name: true, gender: true, birthDate: true },
    });
    if (!child) throw new NotFoundException();
    return { child, ...(await this.rooms.roomOf(childId)) };
  }
}
