import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PhysicalGrowthService } from './physical-growth.service';

@Controller('physical-growth')
@UseGuards(AuthGuard('jwt'))
export class PhysicalGrowthController {
  constructor(private service: PhysicalGrowthService) {}

  @Get()
  findAll(@Req() req, @Query('childId') childId: string) {
    return this.service.findAll(req.user.id, childId);
  }

  @Post()
  create(@Req() req, @Body() body: any) {
    return this.service.create(req.user.id, {
      childId: body.childId,
      measuredAt: body.measuredAt,
      heightCm: body.heightCm != null ? Number(body.heightCm) : undefined,
      weightKg: body.weightKg != null ? Number(body.weightKg) : undefined,
      headCircumCm:
        body.headCircumCm != null ? Number(body.headCircumCm) : undefined,
      memo: body.memo,
    });
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.service.update(req.user.id, id, {
      measuredAt: body.measuredAt,
      heightCm: body.heightCm != null ? Number(body.heightCm) : undefined,
      weightKg: body.weightKg != null ? Number(body.weightKg) : undefined,
      headCircumCm:
        body.headCircumCm != null ? Number(body.headCircumCm) : undefined,
      memo: body.memo,
    });
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
