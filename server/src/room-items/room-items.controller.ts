import { Controller, Get } from '@nestjs/common';
import { RoomItemsService } from './room-items.service';

@Controller('room-items')
export class RoomItemsController {
  constructor(private roomItemsService: RoomItemsService) {}

  @Get()
  async findAll() {
    const items = await this.roomItemsService.findActive();
    return { items };
  }
}
