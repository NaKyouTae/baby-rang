import { Module } from '@nestjs/common';
import { NursingRoomsController } from './nursing-rooms.controller';
import { NursingRoomsService } from './nursing-rooms.service';

@Module({
  controllers: [NursingRoomsController],
  providers: [NursingRoomsService],
})
export class NursingRoomsModule {}
