import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BroadcastService } from './broadcast.service';
import { BroadcastResolver } from './broadcast.resolver';
import { BroadcastController } from './broadcast.controller';
import { BroadcastEntity, BroadcastSchema } from '../../schema/Broadcast.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import {
  UserGroupEntity,
  UserGroupSchema,
} from '../../schema/User_Group.model';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BroadcastEntity.name, schema: BroadcastSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: GroupEntity.name, schema: GroupSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
    forwardRef(() => TelegramBotModule),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastResolver],
  exports: [BroadcastService],
})
export class BroadcastModule {}
