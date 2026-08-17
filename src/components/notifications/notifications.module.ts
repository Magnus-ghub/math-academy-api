import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import {
  NotificationEntity,
  NotificationSchema,
} from '../../schema/Notification.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import {
  UserGroupEntity,
  UserGroupSchema,
} from '../../schema/User_Group.model';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationEntity.name, schema: NotificationSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
    TelegramBotModule,
  ],
  providers: [NotificationsService, NotificationsResolver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
