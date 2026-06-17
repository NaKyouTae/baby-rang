import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService, OAuthResult } from './auth.service';
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
    const result = req.user as OAuthResult;
    const clientUrl =
      this.configService.get('CLIENT_URL') || 'http://localhost:3000';

    if (result.kind === 'existing') {
      const { accessToken } = this.authService.generateToken(result.userId);
      return res.redirect(`${clientUrl}/api/auth/session?token=${accessToken}`);
    }

    // 신규: user를 만들지 않고 signup_token만 발급. 회원가입 버튼 클릭 시점에 user 생성.
    const signupToken = this.authService.generateSignupToken(result.profile);
    return res.redirect(
      `${clientUrl}/api/auth/session?signupToken=${signupToken}`,
    );
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleLogin() {
    // Apple 로그인 페이지로 리다이렉트
  }

  // Apple 은 name/email scope 요청 시 form_post 로 콜백하므로 POST.
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  appleCallback(@Req() req, @Res() res: Response) {
    const result = req.user as OAuthResult;
    const clientUrl =
      this.configService.get('CLIENT_URL') || 'http://localhost:3000';

    if (result.kind === 'existing') {
      const { accessToken } = this.authService.generateToken(result.userId);
      return res.redirect(`${clientUrl}/api/auth/session?token=${accessToken}`);
    }

    const signupToken = this.authService.generateSignupToken(result.profile);
    return res.redirect(
      `${clientUrl}/api/auth/session?signupToken=${signupToken}`,
    );
  }

  // signup_token으로 소셜 프로필 미리보기 (온보딩 화면에 이메일 등 표시용).
  @Post('signup/context')
  signupContext(@Body() body: { signupToken: string }) {
    const payload = this.authService.verifySignupToken(body.signupToken);
    return {
      provider: payload.provider,
      nickname: payload.nickname ?? null,
      email: payload.email ?? null,
      profileImage: payload.profileImage ?? null,
    };
  }

  @Post('signup')
  signup(
    @Body()
    body: {
      signupToken: string;
      nickname: string;
      parentRole: string;
      birthYear?: number | null;
      consents?: {
        terms?: boolean;
        privacy?: boolean;
        marketing?: boolean;
        thirdParty?: boolean;
      };
      children?: Array<{
        name: string;
        gender: string;
        birthDate: string;
        dueDate?: string;
      }>;
    },
  ) {
    const { signupToken, ...dto } = body;
    return this.authService.signup(signupToken, dto);
  }

  // 카드사 심사관용 테스트 로그인. 하드코딩된 자격증명 검증 후 access_token 반환.
  @Post('test-login')
  testLogin(@Body() body: { username: string; password: string }) {
    return this.authService.testLogin(body.username, body.password);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Req() req,
    @Body()
    body: {
      nickname?: string;
      parentRole?: string;
      birthYear?: number | null;
    },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Get('consents')
  @UseGuards(AuthGuard('jwt'))
  getConsents(@Req() req) {
    return this.authService.getConsents(req.user.id);
  }

  @Patch('consents')
  @UseGuards(AuthGuard('jwt'))
  updateConsents(
    @Req() req,
    @Body() body: { marketing?: boolean; thirdParty?: boolean },
  ) {
    return this.authService.updateConsents(req.user.id, body);
  }

  @Delete('withdraw')
  @UseGuards(AuthGuard('jwt'))
  withdraw(@Req() req) {
    return this.authService.withdraw(req.user.id);
  }
}
