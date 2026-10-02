import { Controller, Get } from '@nestjs/common';
import { FaqsService } from './faqs.service';

@Controller('faqs')
export class FaqsController {
  constructor(private faqsService: FaqsService) {}

  @Get()
  async findAll() {
    const faqs = await this.faqsService.findPublished();
    return { faqs };
  }
}
