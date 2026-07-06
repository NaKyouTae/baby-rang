import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScreenPreferenceService } from './screen-preference.service';

@Controller('screen-preference')
@UseGuards(AuthGuard('jwt'))
export class ScreenPreferenceController {
  constructor(private screenPreferenceService: ScreenPreferenceService) {}

  @Get()
  async find(@Req() req) {
    return this.screenPreferenceService.find(req.user.id);
  }

  @Put()
  async update(@Req() req, @Body() body: { home?: unknown }) {
    return this.screenPreferenceService.update(req.user.id, body);
  }
}
