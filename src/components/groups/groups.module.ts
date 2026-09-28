import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { GroupsResolver } from './groups.resolver';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupSchema } from '../../schema/User_Group.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import { TelegramChatEntity, TelegramChatSchema } from '../../schema/TelegramChat.model';
import { TelegramChatsService } from './telegram-chats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupEntity.name, schema: GroupSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: TelegramChatEntity.name, schema: TelegramChatSchema },
    ]),
  ],
  providers: [GroupsService, GroupsResolver, TelegramChatsService],
  exports: [GroupsService, TelegramChatsService],
})
export class GroupsModule {}
