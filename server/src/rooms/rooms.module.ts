import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { InventoryService } from './inventory.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [RoomsController],
  providers: [RoomsService, InventoryService],
})
export class RoomsModule {}
