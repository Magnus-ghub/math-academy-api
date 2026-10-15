import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { Broadcast } from '../../libs/dto/broadcast/broadcast';
import { BroadcastInput } from '../../libs/dto/broadcast/broadcastInput';
import { UserRole } from '../../libs/enums/user.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Broadcast)
export class BroadcastResolver {
  constructor(private broadcastService: BroadcastService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Broadcast])
  async getBroadcasts() {
    return this.broadcastService.getBroadcasts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Broadcast)
  async sendBroadcast(
    @CurrentUser() user: any,
    @Args('input') input: BroadcastInput,
  ) {
    return this.broadcastService.startBroadcast(user.userId, input);
  }
}
