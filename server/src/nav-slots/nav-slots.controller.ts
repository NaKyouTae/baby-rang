import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NavSlotsService } from './nav-slots.service';

@Controller('nav-slots')
@UseGuards(AuthGuard('jwt'))
export class NavSlotsController {
  constructor(private navSlotsService: NavSlotsService) {}

  @Get()
  async findAll(@Req() req) {
    const slots = await this.navSlotsService.findAll(req.user.id);
    return { slots };
  }

  @Put()
  async replaceAll(@Req() req, @Body('slots') slots: unknown) {
    const result = await this.navSlotsService.replaceAll(req.user.id, slots);
    return { slots: result };
  }

  @Put('reorder')
  async reorder(
    @Req() req,
    @Body('from') from: number,
    @Body('to') to: number,
  ) {
    const result = await this.navSlotsService.reorder(req.user.id, from, to);
    return { slots: result };
  }
}
