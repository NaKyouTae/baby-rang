import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(AuthGuard('jwt'))
export class GroupsController {
  constructor(private service: GroupsService) {}

  /** 내가 속한 모든 그룹 (owner 여부 포함) */
  @Get()
  list(@Req() req) {
    return this.service.listMyGroups(req.user.id);
  }

  /** 코드 입력하여 그룹 합류 */
  @Post('join')
  join(@Req() req, @Body('code') code: string) {
    return this.service.join(req.user.id, code);
  }

  /** 멤버 추방 — owner만 가능 */
  @Delete(':groupId/members/:userId')
  removeMember(
    @Req() req,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.service.removeMember(req.user.id, groupId, targetUserId);
  }

  /** 그룹 나가기 (본인) */
  @Delete(':groupId/me')
  leave(@Req() req, @Param('groupId') groupId: string) {
    return this.service.leave(req.user.id, groupId);
  }

  /** 코드 재발급 — owner만 가능 */
  @Patch(':groupId/code')
  regenerateCode(@Req() req, @Param('groupId') groupId: string) {
    return this.service.regenerateCode(req.user.id, groupId);
  }
}
