import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { CreateNursingRoomReportDto, NursingRoomsService } from './nursing-rooms.service';

@Controller('nursing-rooms')
export class NursingRoomsController {
  constructor(private service: NursingRoomsService) {}

  @Get()
  async list() {
    const rooms = await this.service.findApproved();
    return { rooms };
  }

  @Get('geocode')
  async geocode(@Query('query') query: string) {
    return this.service.geocode(query);
  }

  @Post('reports')
  async createReport(@Body() dto: CreateNursingRoomReportDto, @Req() req: any) {
    const userId = req.user?.id;
    const report = await this.service.createReport(dto, userId);
    return { report };
  }
}
