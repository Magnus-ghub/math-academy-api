import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const { accessToken, user, isNewUser } = await this.authService.googleLogin(req.user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    const params = new URLSearchParams({
      token: accessToken,
      userId: user.id,
      userName: user.userName ?? '',
      userRole: user.userRole,
      email: user.userEmail ?? '',
      isNewUser: isNewUser ? 'true' : 'false',
    });

    res.redirect(`${frontendUrl}/google/callback?${params.toString()}`);
  }
}
