import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin() {
    // Kakao 로그인 페이지로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  kakaoCallback(@Req() req, @Res() res: Response) {
    const token = this.authService.generateToken(req.user.id);
    const clientUrl =
      this.configService.get('CLIENT_URL') || 'http://localhost:3000';
    res.redirect(`${clientUrl}/auth/callback?token=${token.accessToken}`);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }

  @Post('onboarding')
  @UseGuards(AuthGuard('jwt'))
  completeOnboarding(
    @Req() req,
    @Body()
    body: {
      nickname: string;
      parentRole: string;
      birthYear?: number | null;
      children?: Array<{ name: string; gender: string; birthDate: string }>;
    },
  ) {
    return this.authService.completeOnboarding(req.user.id, body);
  }

  @Delete('withdraw')
  @UseGuards(AuthGuard('jwt'))
  withdraw(@Req() req) {
    return this.authService.withdraw(req.user.id);
  }
}
