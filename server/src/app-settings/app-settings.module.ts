import { Module } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';

@Module({
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  // 어드민 컨트롤러에서 같은 조회/저장 로직을 쓰도록 내보낸다.
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
