import { Controller, Get, Param } from '@nestjs/common';
import { NoticesService } from './notices.service';

@Controller('notices')
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  @Get()
  async findAll() {
    const notices = await this.noticesService.findPublished();
    return { notices };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.noticesService.findOne(id);
  }
}
