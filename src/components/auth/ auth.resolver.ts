import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { QrLoginService } from './qr-login.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from 'src/libs/enums/user.enum';
import { User } from 'src/libs/dto/users/user';
import { UserGroup } from 'src/libs/dto/group/group';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;

  @Field(() => [UserGroup])
  groups: UserGroup[];

  @Field({ nullable: true })
  isNewUser?: boolean;
}

@ObjectType()
export class QrSessionStatus {
  @Field()
  status: string;

  @Field(() => AuthResponse, { nullable: true })
  session?: AuthResponse;
}

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private qrLoginService: QrLoginService,
  ) {}

  @Mutation(() => String)
  async createQrSession() {
    return this.qrLoginService.createSession();
  }

  @Query(() => QrSessionStatus)
  async checkQrSession(@Args('sessionId') sessionId: string): Promise<QrSessionStatus> {
    const session = this.qrLoginService.getSession(sessionId);
    if (!session) return { status: 'NOT_FOUND' };
    return { status: session.status, session: session.result };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => String)
  async adminGenerateLoginLink(@Args('userId') userId: string) {
    return this.authService.adminGenerateLoginLink(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => String)
  async adminGenerateRebindLink(@Args('userId') userId: string) {
    return this.authService.adminGenerateRebindLink(userId);
  }

  @Mutation(() => AuthResponse)
  async telegramLogin(
    @Args('telegramId') telegramId: string,
    @Args('hash') hash: string,
    @Args('authDate', { type: () => Int }) authDate: number,
    @Args('userName', { nullable: true }) userName?: string,
    @Args('userLastName', { nullable: true }) userLastName?: string,
    @Args('userImage', { nullable: true }) userImage?: string,
    @Args('telegramUsername', { nullable: true }) telegramUsername?: string,
  ) {
    return this.authService.telegramLogin({
      telegramId,
      userName,
      userLastName,
      userImage,
      telegramUsername,
      hash,
      authDate,
    });
  }

  @Mutation(() => AuthResponse)
  async telegramBotLogin(@Args('token') token: string) {
    return this.authService.telegramBotLogin(token);
  }

  @Mutation(() => AuthResponse)
  async googleLogin(
    @Args('googleId') googleId: string,
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('avatar', { nullable: true }) avatar?: string,
  ) {
    return this.authService.googleLogin({ googleId, name, email, avatar });
  }

  @Mutation(() => AuthResponse)
  async loginWithEmail(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.loginWithEmail(email, password);
  }

  @Mutation(() => Boolean)
  async setGooglePassword(
    @Args('userId') userId: string,
    @Args('password') password: string,
  ) {
    return this.authService.setGooglePassword(userId, password);
  }

  @Mutation(() => Boolean)
  async requestPasswordReset(@Args('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => AuthResponse)
  async refreshMyGroups(@CurrentUser() currentUser: any) {
    return this.authService.refreshMyGroups(currentUser.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  async changePassword(
    @CurrentUser() currentUser: any,
    @Args('newPassword') newPassword: string,
    @Args('currentPassword', { nullable: true }) currentPassword?: string,
  ) {
    return this.authService.changePassword(currentUser.userId, currentPassword, newPassword);
  }
}
