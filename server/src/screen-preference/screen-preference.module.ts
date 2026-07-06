import { Module } from '@nestjs/common';
import { ScreenPreferenceController } from './screen-preference.controller';
import { ScreenPreferenceService } from './screen-preference.service';

@Module({
  controllers: [ScreenPreferenceController],
  providers: [ScreenPreferenceService],
})
export class ScreenPreferenceModule {}
