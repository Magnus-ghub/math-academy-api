import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { User } from 'src/libs/dto/users/user';
import { UserUpdate, AdminUserUpdate } from 'src/libs/dto/users/userUpdate';
import { UzRegionType } from 'src/libs/dto/common/region';
import { UZBEKISTAN_REGIONS } from 'src/libs/constants/uzbekistan-regions';

@Resolver(() => User)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  // Ro'yxatdan o'tishda bot ishlatadigan ro'yxat bilan bir xil manba —
  // profil sahifasidagi viloyat/tuman select shu yerdan oladi.
  @Query(() => [UzRegionType])
  getUzbekistanRegions() {
    return UZBEKISTAN_REGIONS.map((r) => ({
      code: r.code,
      name: r.name,
      districts: r.districts.map((d) => d.name),
    }));
  }

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Query(() => [User])
  async searchUsers(@Args('search') search: string) {
    return this.usersService.searchUsers(search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => User)
  async adminUpdateUser(
    @Args('userId') userId: string,
    @Args('input') input: AdminUserUpdate,
  ) {
    return this.usersService.adminUpdateUser(userId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [User])
  async getAllUsers() {
    return this.usersService.getAllUsers();
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
