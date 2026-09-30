import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { AppStoreWebhookController } from './app-store-webhook.controller';
import { PaymentsService } from './payments.service';
import { GooglePlayService } from './google-play.service';
import { AppStoreService } from './app-store.service';

@Module({
  controllers: [
    PaymentsController,
    PaymentsWebhookController,
    AppStoreWebhookController,
  ],
  providers: [PaymentsService, GooglePlayService, AppStoreService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
