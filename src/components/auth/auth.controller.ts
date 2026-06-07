import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const { accessToken, user } = await this.authService.googleLogin(req.user);

    // Frontend ga redirect — token bilan
    res.redirect(
      `https://cuben.info/auth/google/callback?token=${accessToken}&userId=${user.id}&userName=${user.userName}&userRole=${user.userRole}`,
    );
  }
}