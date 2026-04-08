import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GrowthQuickButtonsService } from './growth-quick-buttons.service';

@Controller('growth-quick-buttons')
@UseGuards(AuthGuard('jwt'))
export class GrowthQuickButtonsController {
  constructor(private service: GrowthQuickButtonsService) {}

  @Get()
  async findAll(@Req() req) {
    const types = await this.service.findAll(req.user.id);
    return { types };
  }

  @Put()
  async replaceAll(@Req() req, @Body('types') types: unknown) {
    const result = await this.service.replaceAll(req.user.id, types);
    return { types: result };
  }
}
