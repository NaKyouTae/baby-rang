import { Module } from '@nestjs/common';
import { CrawlerVisitsController } from './crawler-visits.controller';
import { CrawlerVisitsService } from './crawler-visits.service';

@Module({
  controllers: [CrawlerVisitsController],
  providers: [CrawlerVisitsService],
  // 어드민 통계 화면이 같은 집계를 쓴다.
  exports: [CrawlerVisitsService],
})
export class CrawlerVisitsModule {}
