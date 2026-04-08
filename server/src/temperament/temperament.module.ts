import { Module } from '@nestjs/common';
import { TemperamentController } from './temperament.controller';
import { TemperamentService } from './temperament.service';

@Module({
  controllers: [TemperamentController],
  providers: [TemperamentService],
})
export class TemperamentModule {}
