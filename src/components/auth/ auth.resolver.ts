import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
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

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async telegramLogin(
    @Args('telegramId') telegramId: string,
    @Args('hash') hash: string,
    @Args('authDate', { type: () => Int }) authDate: number,
    @Args('userName', { nullable: true }) userName?: string,
    @Args('userLastName', { nullable: true }) userLastName?: string,
    @Args('userImage', { nullable: true }) userImage?: string,
  ) {
    return this.authService.telegramLogin({
      telegramId,
      userName,
      userLastName,
      userImage,
      hash,
      authDate,
    });
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
  @Mutation(() => Boolean)
  async changePassword(
    @CurrentUser() currentUser: any,
    @Args('newPassword') newPassword: string,
    @Args('currentPassword', { nullable: true }) currentPassword?: string,
  ) {
    return this.authService.changePassword(currentUser.userId, currentPassword, newPassword);
  }
}
