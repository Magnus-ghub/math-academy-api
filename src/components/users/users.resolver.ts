import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { User } from 'src/libs/dto/users/user';
import { UserUpdate } from 'src/libs/dto/users/userUpdate';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => User)
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => User)
  async updateUser(
    @CurrentUser() user: any,
    @Args('input') input: UserUpdate,
  ) {
    return this.usersService.updateUser(user.userId, input);
  }

  // ADMIN only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [User])
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => User)
  async blockUser(@Args('userId') userId: string) {
    return this.usersService.blockUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => User)
  async changeRole(
    @Args('userId') userId: string,
    @Args('userRole', { type: () => UserRole }) userRole: UserRole,
  ) {
    return this.usersService.changeRole(userId, userRole);
  }
}