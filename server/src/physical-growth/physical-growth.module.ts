import { Module } from '@nestjs/common';
import { PhysicalGrowthController } from './physical-growth.controller';
import { PhysicalGrowthService } from './physical-growth.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [PhysicalGrowthController],
  providers: [PhysicalGrowthService],
})
export class PhysicalGrowthModule {}
