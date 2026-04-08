import { Module } from '@nestjs/common';
import { NavSlotsController } from './nav-slots.controller';
import { NavSlotsService } from './nav-slots.service';

@Module({
  controllers: [NavSlotsController],
  providers: [NavSlotsService],
})
export class NavSlotsModule {}
