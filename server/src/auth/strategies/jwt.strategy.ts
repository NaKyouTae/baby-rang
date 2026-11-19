import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/** 마지막 사용 시각은 이 간격보다 오래됐을 때만 갱신한다 */
const LAST_SEEN_INTERVAL_MS = 5 * 60_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub?: string; type?: string }) {
    // signup_token·소켓 티켓으로는 보호된 라우트를 호출할 수 없게 차단.
    if (
      payload?.type === 'signup' ||
      payload?.type === 'socket' ||
      !payload?.sub
    ) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      user &&
      (!user.lastSeenAt ||
        Date.now() - user.lastSeenAt.getTime() > LAST_SEEN_INTERVAL_MS)
    ) {
      // 응답을 기다리게 하지 않는다. updatedAt 이 바뀌지 않도록 raw 로 갱신한다.
      this.prisma
        .$executeRaw`UPDATE "users" SET "lastSeenAt" = ${new Date()} WHERE "id" = ${user.id}`.catch(
        () => {},
      );
    }
    return user;
  }
}
