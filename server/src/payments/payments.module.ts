import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { GooglePlayService } from './google-play.service';

@Module({
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, GooglePlayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
