import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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
    // signup_token으로는 보호된 라우트를 호출할 수 없게 차단.
    if (payload?.type === 'signup' || !payload?.sub) {
      throw new UnauthorizedException();
    }
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
  }
}
