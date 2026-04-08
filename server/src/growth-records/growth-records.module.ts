import { Module } from '@nestjs/common';
import { GrowthRecordsController } from './growth-records.controller';
import { GrowthRecordsService } from './growth-records.service';

@Module({
  controllers: [GrowthRecordsController],
  providers: [GrowthRecordsService],
})
export class GrowthRecordsModule {}
