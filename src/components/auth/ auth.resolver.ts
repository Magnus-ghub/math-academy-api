import { Resolver, Mutation, Args, Int } from '@nestjs/graphql';
import { AuthService } from './auth.service';
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
    return this.authService.googleLogin({
      googleId,
      name,
      email,
      avatar,
    });
  }
}
