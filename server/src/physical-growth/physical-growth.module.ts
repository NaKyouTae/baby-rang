import { Module } from '@nestjs/common';
import { PhysicalGrowthController } from './physical-growth.controller';
import { PhysicalGrowthService } from './physical-growth.service';

@Module({
  controllers: [PhysicalGrowthController],
  providers: [PhysicalGrowthService],
})
export class PhysicalGrowthModule {}
