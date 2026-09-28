import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { memorySnapshot } from './memory-logger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 구독 메모리 산정용 — 배포된 서버에 curl 로 언제든 물어볼 수 있게 열어 둔다.
  @Get('memory')
  getMemory() {
    return memorySnapshot();
  }
}
