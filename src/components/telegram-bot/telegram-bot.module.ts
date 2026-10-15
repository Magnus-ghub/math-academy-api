import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramBotService } from './telegram-bot.service';
import { AuthModule } from '../auth/auth.module';
import { ResultsModule } from '../results/results.module';
import { GroupsModule } from '../groups/groups.module';
import { UserEntity, UserSchema } from 'src/schema/User.model';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ResultsModule,
    GroupsModule,
    forwardRef(() => BroadcastModule),
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
