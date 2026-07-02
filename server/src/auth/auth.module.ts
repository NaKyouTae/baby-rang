import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        // 긴 수명 + 클라이언트 슬라이딩 재발급(/auth/refresh)으로 "무한 로그인" 구현
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '180d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, KakaoStrategy, AppleStrategy, JwtStrategy],
})
export class AuthModule {}
