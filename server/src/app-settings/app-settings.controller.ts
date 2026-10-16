import { Controller, Get } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

// 앱이 로그인 전에도 광고 네트워크를 알아야 하므로 인증 없이 공개한다.
@Controller('app-settings')
export class AppSettingsController {
  constructor(private appSettings: AppSettingsService) {}

  @Get()
  async get() {
    return this.appSettings.get();
  }
}
