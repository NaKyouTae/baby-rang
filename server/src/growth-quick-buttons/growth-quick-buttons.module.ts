import { Module } from '@nestjs/common';
import { GrowthQuickButtonsController } from './growth-quick-buttons.controller';
import { GrowthQuickButtonsService } from './growth-quick-buttons.service';

@Module({
  controllers: [GrowthQuickButtonsController],
  providers: [GrowthQuickButtonsService],
})
export class GrowthQuickButtonsModule {}
