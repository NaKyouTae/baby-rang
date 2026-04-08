import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GrowthRecordsService } from './growth-records.service';

const IMAGE_FILTER = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (!/^image\//.test(file.mimetype)) {
    return cb(new Error('이미지 파일만 업로드할 수 있습니다.'), false);
  }
  cb(null, true);
};
const MAX_IMAGES = 5;

@Controller('growth-records')
@UseGuards(AuthGuard('jwt'))
export class GrowthRecordsController {
  constructor(private service: GrowthRecordsService) {}

  @Get('earliest')
  earliest(@Req() req, @Query('childId') childId: string) {
    return this.service.earliestDate(req.user.id, childId);
  }

  @Get('range')
  range(
    @Req() req,
    @Query('childId') childId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.findByRange(req.user.id, childId, from, to);
  }

  @Get()
  list(
    @Req() req,
    @Query('childId') childId: string,
    @Query('date') date: string,
  ) {
    return this.service.findByDate(req.user.id, childId, date);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES, { fileFilter: IMAGE_FILTER }),
  )
  create(
    @Req() req,
    @Body('childId') childId: string,
    @Body('type') type: string,
    @Body('startAt') startAt: string,
    @Body('endAt') endAt?: string,
    @Body('memo') memo?: string,
    @Body('data') data?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.create(
      req.user.id,
      { childId, type, startAt, endAt, memo, data },
      files,
    );
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES, { fileFilter: IMAGE_FILTER }),
  )
  update(
    @Req() req,
    @Param('id') id: string,
    @Body('type') type?: string,
    @Body('startAt') startAt?: string,
    @Body('endAt') endAt?: string,
    @Body('memo') memo?: string,
    @Body('data') data?: string,
    @Body('keepImageUrls') keepImageUrls?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.update(
      req.user.id,
      id,
      { type, startAt, endAt, memo, data },
      files,
      keepImageUrls,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
