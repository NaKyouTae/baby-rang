import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { InventoryService } from './inventory.service';
import { ChildrenModule } from '../children/children.module';
import { RoomViewController } from './room-view.controller';

@Module({
  imports: [
    ChildrenModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [RoomsController, RoomViewController],
  providers: [RoomsService, InventoryService],
})
export class RoomsModule {}
