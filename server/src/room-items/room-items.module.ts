import { Module } from '@nestjs/common';
import { RoomItemsController } from './room-items.controller';
import { RoomItemsService } from './room-items.service';

@Module({
  controllers: [RoomItemsController],
  providers: [RoomItemsService],
})
export class RoomItemsModule {}
