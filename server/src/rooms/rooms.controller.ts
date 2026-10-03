import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@UseGuards(AuthGuard('jwt'))
export class RoomsController {
  constructor(private service: RoomsService) {}

  @Get(':childId')
  find(@Req() req, @Param('childId') childId: string) {
    return this.service.find(req.user.id, childId);
  }

  /** 방 전체를 한 번에 덮어쓴다. 부분 수정은 받지 않는다 — 겹침 검사 때문. */
  @Put(':childId')
  replace(@Req() req, @Param('childId') childId: string, @Body() body: any) {
    return this.service.replaceLayout(req.user.id, childId, {
      version: Number(body?.version ?? 0),
      roomItemId: body?.roomItemId ?? null,
      placements: Array.isArray(body?.placements) ? body.placements : [],
    });
  }
}
