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
    const { accessToken, user } = await this.authService.googleLogin(req.user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    res.redirect(
      `${frontendUrl}/google/callback?token=${accessToken}&userId=${user.id}&userName=${user.userName}&userRole=${user.userRole}`,
    );
  }
}