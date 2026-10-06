import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomsService } from './rooms.service';
import { InventoryService } from './inventory.service';

@Controller('rooms')
@UseGuards(AuthGuard('jwt'))
export class RoomsController {
  constructor(
    private service: RoomsService,
    private inventory: InventoryService,
  ) {}

  /** 보유 목록과 재화 잔액. 꾸미기 시트가 '살 수 있는지'를 판단하는 근거다. */
  @Get('inventory/:childId')
  inventoryOf(@Req() req, @Param('childId') childId: string) {
    return this.inventory.find(req.user.id, childId);
  }

  /** 충전 상품 목록. 잔액이 모자랄 때 '충전하기'가 쓴다. */
  @Get('coin-packs')
  coinPacks() {
    return this.inventory.coinPacks();
  }

  /** 보석 충전 내역. 보석함의 '구매 내역' 탭. */
  @Get('coin-history/charges/:childId')
  chargeHistory(
    @Req() req,
    @Param('childId') childId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.inventory.chargeHistory(
      req.user.id,
      childId,
      Math.min(Number(take) || 20, 100),
      Number(skip) || 0,
    );
  }

  /** 보석 사용 내역. 보석함의 '사용 내역' 탭. */
  @Get('coin-history/spends/:childId')
  spendHistory(
    @Req() req,
    @Param('childId') childId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.inventory.spendHistory(
      req.user.id,
      childId,
      Math.min(Number(take) || 20, 100),
      Number(skip) || 0,
    );
  }

  @Post('purchase/:itemId')
  purchase(
    @Req() req,
    @Param('itemId') itemId: string,
    @Query('childId') childId: string,
  ) {
    return this.inventory.purchase(req.user.id, childId, itemId);
  }

  @Get(':childId')
  find(@Req() req, @Param('childId') childId: string) {
    return this.service.find(req.user.id, childId);
  }

  /** 방 전체를 한 번에 덮어쓴다. 부분 수정은 받지 않는다 — 겹침 검사 때문. */
  @Put(':childId')
  replace(@Req() req, @Param('childId') childId: string, @Body() body: any) {
    return this.service.replaceLayout(req.user.id, childId, {
      version: Number(body?.version ?? 0),
      wallpaperItemId: body?.wallpaperItemId ?? null,
      flooringItemId: body?.flooringItemId ?? null,
      placements: Array.isArray(body?.placements) ? body.placements : [],
    });
  }
}
