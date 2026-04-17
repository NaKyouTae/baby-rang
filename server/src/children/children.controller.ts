import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChildrenService } from './children.service';

@Controller('children')
@UseGuards(AuthGuard('jwt'))
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  @Get()
  findAll(@Req() req) {
    return this.childrenService.findAll(req.user.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('profileImage'))
  create(
    @Req() req,
    @Body('name') name: string,
    @Body('gender') gender: string,
    @Body('birthDate') birthDate: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.childrenService.create(
      req.user.id,
      name,
      gender,
      birthDate,
      file,
    );
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('profileImage'))
  update(
    @Req() req,
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('gender') gender: string,
    @Body('birthDate') birthDate: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.childrenService.update(
      req.user.id,
      id,
      name,
      gender,
      birthDate,
      file,
    );
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.childrenService.remove(req.user.id, id);
  }

  @Delete(':id/profile-image')
  removeProfileImage(@Req() req, @Param('id') id: string) {
    return this.childrenService.removeProfileImage(req.user.id, id);
  }
}
