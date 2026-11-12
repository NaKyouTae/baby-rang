import { Module } from '@nestjs/common';
import { ChildrenModule } from '../children/children.module';
import { AdRewardsController } from './ad-rewards.controller';
import { AdmobSsvController } from './admob-ssv.controller';
import { AdmobSsvVerifier } from './admob-ssv-verifier';
import { AdRewardsService } from './ad-rewards.service';

@Module({
  imports: [ChildrenModule],
  controllers: [AdRewardsController, AdmobSsvController],
  providers: [AdRewardsService, AdmobSsvVerifier],
})
export class AdRewardsModule {}
