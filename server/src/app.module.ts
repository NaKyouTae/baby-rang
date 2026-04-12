import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { ChildrenModule } from './children/children.module';
import { PaymentsModule } from './payments/payments.module';
import { TemperamentModule } from './temperament/temperament.module';
import { NavSlotsModule } from './nav-slots/nav-slots.module';
import { BannersModule } from './banners/banners.module';
import { NoticesModule } from './notices/notices.module';
import { AdminModule } from './admin/admin.module';
import { GrowthRecordsModule } from './growth-records/growth-records.module';
import { GrowthQuickButtonsModule } from './growth-quick-buttons/growth-quick-buttons.module';
import { NursingRoomsModule } from './nursing-rooms/nursing-rooms.module';
import { SharesModule } from './shares/shares.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    ChildrenModule,
    PaymentsModule,
    TemperamentModule,
    NavSlotsModule,
    BannersModule,
    NoticesModule,
    AdminModule,
    GrowthRecordsModule,
    GrowthQuickButtonsModule,
    NursingRoomsModule,
    SharesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
