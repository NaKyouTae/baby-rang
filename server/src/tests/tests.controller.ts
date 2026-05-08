import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TestsService } from './tests.service';

@Controller('tests')
export class TestsController {
  constructor(private testsService: TestsService) {}

  @Get()
  async findAll() {
    const tests = await this.testsService.findActive();
    return { tests };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const test = await this.testsService.findById(id);
    if (!test) throw new NotFoundException('테스트를 찾을 수 없습니다.');
    return { test };
  }
}
