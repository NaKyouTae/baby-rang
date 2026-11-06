import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { SOCKET_TICKET_TYPE } from './realtime.gateway';

@Controller('realtime')
@UseGuards(AuthGuard('jwt'))
export class RealtimeController {
  constructor(private jwt: JwtService) {}

  // 소켓 연결 한 번에만 쓰는 티켓. 연결이 끊겨 다시 붙을 때마다 새로 받는다.
  // REST 호출에는 쓸 수 없다(jwt.strategy.ts 가 type=socket 을 막는다).
  @Get('ticket')
  ticket(@Req() req) {
    return {
      ticket: this.jwt.sign(
        { sub: req.user.id, type: SOCKET_TICKET_TYPE },
        { expiresIn: '2m' },
      ),
    };
  }
}
