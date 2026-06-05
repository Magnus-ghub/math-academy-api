import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from '../../libs/dto/group/group';
import { GroupInput } from '../../libs/dto/group/groupInput';
import { GroupUpdate } from '../../libs/dto/group/groupUpdate';
import { UserRole } from '../../libs/enums/user.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Resolver(() => Group)
export class GroupsResolver {
  constructor(private groupsService: GroupsService) {}

  // ADMIN only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Group)
  async createGroup(@Args('input') input: GroupInput) {
    return this.groupsService.createGroup(input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Group)
  async updateGroup(
    @Args('groupId') groupId: string,
    @Args('input') input: GroupUpdate,
  ) {
    return this.groupsService.updateGroup(groupId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Group])
  async getAllGroups() {
    return this.groupsService.getAllGroups();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => Group)
  async getGroupById(@Args('groupId') groupId: string) {
    return this.groupsService.getGroupById(groupId);
  }
}