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
import { SharesService } from './shares.service';

@Controller('shares')
@UseGuards(AuthGuard('jwt'))
export class SharesController {
  constructor(private service: SharesService) {}

  /** 내 공유 정보 (코드 + 멤버 목록) */
  @Get()
  findMyShare(@Req() req) {
    return this.service.findMyShare(req.user.id);
  }

  /** 내가 공유받은 아이 목록 */
  @Get('shared-with-me')
  findSharedWithMe(@Req() req) {
    return this.service.findSharedWithMe(req.user.id);
  }

  /** 코드 입력하여 참여 */
  @Post('join')
  join(@Req() req, @Body('code') code: string) {
    return this.service.join(req.user.id, code);
  }

  /** 공유 멤버 제거 (내가 공유한 특정 사용자의 모든 접근 삭제) */
  @Delete('members/:userId')
  removeMember(@Req() req, @Param('userId') targetUserId: string) {
    return this.service.removeMember(req.user.id, targetUserId);
  }

  /** 공유 나가기 (내가 받은 특정 접근 삭제) */
  @Delete('access/:id')
  leaveAccess(@Req() req, @Param('id') accessId: string) {
    return this.service.leaveAccess(req.user.id, accessId);
  }

  /** 코드 재발급 */
  @Patch('regenerate')
  regenerate(@Req() req) {
    return this.service.regenerate(req.user.id);
  }
}
