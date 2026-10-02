import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller';
import { StorageModule } from '../storage/storage.module';
import { PaymentsModule } from '../payments/payments.module';
import { CrawlerVisitsModule } from '../crawler-visits/crawler-visits.module';

@Module({
  imports: [StorageModule, PaymentsModule, CrawlerVisitsModule],
  controllers: [AdminAuthController, AdminController],
})
export class AdminModule {}
