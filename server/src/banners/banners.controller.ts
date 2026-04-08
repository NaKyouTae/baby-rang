import { Controller, Get } from '@nestjs/common';
import { BannersService } from './banners.service';

@Controller('banners')
export class BannersController {
  constructor(private bannersService: BannersService) {}

  @Get()
  async findAll() {
    const banners = await this.bannersService.findActive();
    return { banners };
  }
}
