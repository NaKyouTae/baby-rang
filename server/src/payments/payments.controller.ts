import {
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
import {
  CancelPaymentDto,
  ConfirmPaymentDto,
  CreatePaymentDto,
  FailPaymentDto,
  ListPaymentsQuery,
} from './dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get()
  list(@Req() req, @Query() query: ListPaymentsQuery) {
    return this.payments.list(req.user.id, query);
  }

  @Get(':orderId')
  findOne(@Req() req, @Param('orderId') orderId: string) {
    return this.payments.findOne(req.user.id, orderId);
  }

  @Post()
  create(@Req() req, @Body() dto: CreatePaymentDto) {
    return this.payments.create(req.user.id, dto, {
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Post(':orderId/toss/confirm')
  confirmToss(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() body: { paymentKey: string; amount: number },
  ) {
    return this.payments.confirmToss(
      req.user.id,
      orderId,
      body.paymentKey,
      body.amount,
    );
  }

  @Post(':orderId/confirm')
  confirm(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments.confirm(req.user.id, orderId, dto);
  }

  @Post(':orderId/fail')
  fail(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: FailPaymentDto,
  ) {
    return this.payments.fail(req.user.id, orderId, dto);
  }

  @Post(':orderId/cancel')
  cancel(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: CancelPaymentDto,
  ) {
    return this.payments.cancel(req.user.id, orderId, dto);
  }
}
