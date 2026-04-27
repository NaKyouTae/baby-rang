import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NoticesService } from './notices.service';

@Controller('notices')
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  @Get()
  async findAll() {
    const notices = await this.noticesService.findPublished();
    return { notices };
  }

  @Get('has-unread')
  @UseGuards(AuthGuard('jwt'))
  async hasUnread(@Req() req: { user: { id: string } }) {
    const hasUnread = await this.noticesService.hasUnread(req.user.id);
    return { hasUnread };
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markAsRead(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    await this.noticesService.markAsRead(req.user.id, id);
    return { success: true };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.noticesService.findOne(id);
  }
}
