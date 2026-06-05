import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { User } from 'src/libs/dto/users/user';
import { ObjectType, Field } from '@nestjs/graphql';
import { UserAuthType } from '../libs/enums/user.enum';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}

@ObjectType()
export class TelegramAuthInput {
  @Field()
  telegramId: string;

  @Field({ nullable: true })
  userName?: string;

  @Field({ nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  userImage?: string;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async telegramLogin(
    @Args('telegramId') telegramId: string,
    @Args('userName', { nullable: true }) userName?: string,
    @Args('userLastName', { nullable: true }) userLastName?: string,
    @Args('userImage', { nullable: true }) userImage?: string,
  ) {
    return this.authService.telegramLogin({
      telegramId,
      userName,
      userLastName,
      userImage,
    });
  }

  @Mutation(() => AuthResponse)
  async googleLogin(
    @Args('googleId') googleId: string,
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('avatar', { nullable: true }) avatar?: string,
  ) {
    return this.authService.googleLogin({
      googleId,
      name,
      email,
      avatar,
    });
  }
}