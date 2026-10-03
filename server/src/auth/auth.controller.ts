import {
  BadRequestException,
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
import { UseFilters } from '@nestjs/common';
import { OAuthCallbackErrorFilter } from './oauth-callback-error.filter';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { AuthService, OAuthResult } from './auth.service';
import { KakaoNativeService } from './kakao-native.service';
import { KakaoTermsService } from './kakao-terms.service';
import { NaverService } from './naver.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private kakaoNativeService: KakaoNativeService,
    private kakaoTermsService: KakaoTermsService,
    private naverService: NaverService,
  ) {}

  private clientUrl(): string {
    return this.configService.get('CLIENT_URL') || 'http://localhost:3000';
  }

  // 소셜 로그인 결과를 프런트로 넘기는 공통 리다이렉트.
  // 신규든 기존이든 이 시점에 user 가 이미 만들어져 있어 분기가 없다.
  private redirectWithResult(res: Response, result: OAuthResult) {
    const { accessToken } = this.authService.generateToken(result.userId);
    return res.redirect(
      `${this.clientUrl()}/api/auth/session?token=${accessToken}`,
    );
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin() {
    // Kakao 로그인 페이지로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @UseFilters(OAuthCallbackErrorFilter)
  kakaoCallback(@Req() req, @Res() res: Response) {
    return this.redirectWithResult(res, req.user as OAuthResult);
  }

  // 네이버 웹 로그인. 카카오(passport 전략)와 달리 직접 리다이렉트한다.
  // 동의항목은 네이버 개발자센터 설정에서 정해지므로 여기서 scope 를 싣지 않는다.
  // reconsent=1 이면 이미 동의한 사용자에게도 동의 화면을 다시 띄운다.
  // 추가 정보 화면(/additional-info)이 쓰는 경로다 — 그 사용자는 이미 연동돼 있어서
  // 평소 로그인으로는 동의 화면을 볼 수 없고, 그러면 전화번호를 영영 받지 못한다.
  @Get('naver')
  naverLogin(
    @Req() req: { query: { reconsent?: string } },
    @Res() res: Response,
  ) {
    const state = this.authService.generateOAuthState();
    const reprompt = req.query?.reconsent === '1';
    return res.redirect(this.naverService.buildAuthorizeUrl(state, reprompt));
  }

  @Get('naver/callback')
  @UseFilters(OAuthCallbackErrorFilter)
  async naverCallback(
    @Req() req: { query: { code?: string; state?: string; error?: string } },
    @Res() res: Response,
  ) {
    const { code, state, error } = req.query;
    // 사용자가 동의 화면에서 취소하면 code 없이 error 만 돌아온다. 홈으로 되돌린다.
    if (error || !code) {
      return res.redirect(`${this.clientUrl()}/`);
    }
    this.authService.verifyOAuthState(state);

    const tokens = await this.naverService.exchangeCode(code, state!);
    const profile = await this.naverService.fetchProfile(tokens.accessToken);
    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.NAVER,
      providerId: profile.providerId,
      name: profile.name,
      phone: profile.phone,
      gender: profile.gender,
      ageRange: profile.ageRange,
      email: profile.email,
      profileImage: profile.profileImage,
      refreshToken: tokens.refreshToken,
    });
    return this.redirectWithResult(res, result);
  }

  // 네이티브 앱(네이버 앱 로그인) 전용. 카카오 네이티브와 같은 구조다.
  //
  // refreshToken 을 함께 받는 이유는 두 가지다 —
  //   1) 갱신에 성공한다는 것이 "우리 앱이 발급한 토큰"이라는 증거가 된다(naver.service 참고)
  //   2) 회원탈퇴 시 연동해제에 필요하다
  @Post('naver/native')
  async naverNativeLogin(@Body() body: { refreshToken?: string }) {
    if (!body?.refreshToken) {
      throw new BadRequestException('refreshToken 이 필요합니다.');
    }

    const tokens = await this.naverService.verifyNativeTokens(
      body.refreshToken,
    );
    const profile = await this.naverService.fetchProfile(tokens.accessToken);
    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.NAVER,
      providerId: profile.providerId,
      name: profile.name,
      phone: profile.phone,
      gender: profile.gender,
      ageRange: profile.ageRange,
      email: profile.email,
      profileImage: profile.profileImage,
      refreshToken: tokens.refreshToken,
    });

    return this.authService.generateToken(result.userId);
  }

  // 네이티브 앱(카카오톡 앱 로그인) 전용.
  //
  // 웹은 /auth/kakao 리다이렉트로 시작하지만, 앱은 카카오 SDK 가 카카오톡을 열어
  // access token 을 먼저 받아온다. 그 토큰을 여기로 보내면 검증 후 우리 토큰으로 바꿔준다.
  // 리다이렉트가 아니라 JSON 을 돌려주는 것만 다르고, 신규/기존 분기는 웹과 완전히 같다.
  @Post('kakao/native')
  async kakaoNativeLogin(@Body() body: { accessToken?: string }) {
    if (!body?.accessToken) {
      throw new BadRequestException('accessToken 이 필요합니다.');
    }

    const profile = await this.kakaoNativeService.resolveProfile(
      body.accessToken,
    );
    // 간편가입에서 받은 약관 동의. 카카오싱크 미사용이면 빈 객체라 앱이 직접 받는다.
    const consents = await this.kakaoTermsService.fetchConsents(
      body.accessToken,
    );
    const result = await this.authService.resolveOAuthLogin({
      provider: AuthProvider.KAKAO,
      providerId: profile.providerId,
      name: profile.name,
      phone: profile.phone,
      gender: profile.gender,
      ageRange: profile.ageRange,
      email: profile.email,
      profileImage: profile.profileImage,
      consents,
    });

    return this.authService.generateToken(result.userId);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleLogin() {
    // Apple 로그인 페이지로 리다이렉트
  }

  // Apple 은 name/email scope 요청 시 form_post 로 콜백하므로 POST.
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @UseFilters(OAuthCallbackErrorFilter)
  appleCallback(@Req() req, @Res() res: Response) {
    return this.redirectWithResult(res, req.user as OAuthResult);
  }

  // 카드사 심사관용 테스트 로그인. 하드코딩된 자격증명 검증 후 access_token 반환.
  @Post('test-login')
  testLogin(@Body() body: { username: string; password: string }) {
    return this.authService.testLogin(body.username, body.password);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return this.authService.getProfile(req.user.id);
  }

  // 슬라이딩 세션: 유효한 토큰 소지자에게 새 토큰을 재발급 → 활동 중이면 만료 없이 갱신.
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  refresh(@Req() req) {
    return this.authService.generateToken(req.user.id);
  }

  // 홈 화면 위젯 전용 토큰 발급. 앱(웹뷰)이 로그인 상태에서 호출해
  // 네이티브에 저장한 뒤 위젯이 직접 API 호출에 사용한다.
  @Post('widget-token')
  @UseGuards(AuthGuard('jwt'))
  widgetToken(@Req() req) {
    return this.authService.generateWidgetToken(req.user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Req() req, @Body() body: { parentRole?: string }) {
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
