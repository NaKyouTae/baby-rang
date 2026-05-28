import { Module } from '@nestjs/common';
import { GrowthRecordsController } from './growth-records.controller';
import { GrowthRecordsService } from './growth-records.service';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [ChildrenModule],
  controllers: [GrowthRecordsController],
  providers: [GrowthRecordsService],
})
export class GrowthRecordsModule {}
