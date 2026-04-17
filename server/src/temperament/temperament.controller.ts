import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgeGroup } from '@prisma/client';
import { CreateSubmissionDto, SubmitAnswersDto, UnlockResultDto } from './dto';
import { TemperamentService } from './temperament.service';

const VALID_AGE_GROUPS: AgeGroup[] = ['newborn', 'before_first', 'after_first'];

@Controller('temperament')
@UseGuards(AuthGuard('jwt'))
export class TemperamentController {
  constructor(private service: TemperamentService) {}

  @Get('questions')
  getQuestions(@Query('ageGroup') ageGroup?: string) {
    const ag = (ageGroup as AgeGroup) || 'after_first';
    if (!VALID_AGE_GROUPS.includes(ag)) {
      throw new BadRequestException('유효하지 않은 ageGroup');
    }
    return this.service.getQuestions(ag);
  }

  @Post('submissions')
  createSubmission(@Req() req, @Body() dto: CreateSubmissionDto) {
    if (!dto?.ageGroup) {
      throw new BadRequestException('ageGroup is required');
    }
    if (!VALID_AGE_GROUPS.includes(dto.ageGroup)) {
      throw new BadRequestException('유효하지 않은 ageGroup');
    }
    return this.service.createSubmission(req.user.id, dto);
  }

  @Post('submissions/:id/answers')
  submitAnswers(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    if (!Array.isArray(dto?.answers)) {
      throw new BadRequestException('answers is required');
    }
    return this.service.submitAnswers(req.user.id, id, dto);
  }

  @Get('submissions/:id/result')
  getResult(@Req() req, @Param('id') id: string) {
    return this.service.getResult(req.user.id, id);
  }

  @Post('submissions/:id/result/unlock')
  unlockResult(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UnlockResultDto,
  ) {
    if (!dto?.paymentId) throw new BadRequestException('paymentId is required');
    return this.service.unlockResult(req.user.id, id, dto);
  }

  @Get('history')
  getHistory(
    @Req() req,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(limitStr ?? '10', 10) || 10),
    );
    return this.service.getHistory(req.user.id, page, limit);
  }
}
