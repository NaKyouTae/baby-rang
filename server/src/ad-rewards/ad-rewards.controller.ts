import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdRewardsService } from './ad-rewards.service';

/** 보석함의 '광고 보고 보석 받기'. 지급 자체는 AdmobSsvController 가 한다. */
@Controller('ad-rewards')
@UseGuards(AuthGuard('jwt'))
export class AdRewardsController {
  constructor(private service: AdRewardsService) {}

  /** 오늘 남은 횟수. */
  @Get('quota/:childId')
  quota(@Req() req, @Param('childId') childId: string) {
    return this.service.quota(req.user.id, childId);
  }

  /** 광고를 띄우기 전에 부른다. 돌려준 id 를 광고의 custom_data 로 싣는다. */
  @Post('start/:childId')
  start(@Req() req, @Param('childId') childId: string) {
    return this.service.start(req.user.id, childId);
  }

  /** 지급 여부. 광고를 닫은 뒤 콜백이 올 때까지 몇 번 묻는다. */
  @Get(':id')
  status(@Req() req, @Param('id') id: string) {
    return this.service.status(req.user.id, id);
  }
}
