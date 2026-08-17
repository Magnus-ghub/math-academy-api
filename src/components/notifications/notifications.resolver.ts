import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../libs/dto/notification/notification';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => [Notification])
  async getMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getMyNotifications(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Int)
  async getMyUnreadNotificationCount(@CurrentUser() user: any) {
    return this.notificationsService.getMyUnreadCount(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Notification, { nullable: true })
  async markNotificationRead(
    @CurrentUser() user: any,
    @Args('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}
