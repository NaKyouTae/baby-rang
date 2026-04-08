import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller';
import { StorageModule } from '../storage/storage.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [StorageModule, PaymentsModule],
  controllers: [AdminAuthController, AdminController],
})
export class AdminModule {}
