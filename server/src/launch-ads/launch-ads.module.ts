import { Module } from '@nestjs/common';
import { LaunchAdsController } from './launch-ads.controller';

@Module({
  controllers: [LaunchAdsController],
})
export class LaunchAdsModule {}
