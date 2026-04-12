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

  @Post()
  create(@Req() req, @Body('childId') childId: string) {
    return this.service.create(req.user.id, childId);
  }

  @Get()
  findOwned(@Req() req) {
    return this.service.findOwned(req.user.id);
  }

  @Get('joined')
  findJoined(@Req() req) {
    return this.service.findJoined(req.user.id);
  }

  @Post('join')
  join(@Req() req, @Body('code') code: string) {
    return this.service.join(req.user.id, code);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Req() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(req.user.id, id, memberId);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Patch(':id/regenerate')
  regenerate(@Req() req, @Param('id') id: string) {
    return this.service.regenerate(req.user.id, id);
  }
}
