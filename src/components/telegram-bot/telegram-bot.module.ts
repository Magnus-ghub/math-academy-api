import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramBotService } from './telegram-bot.service';
import { AuthModule } from '../auth/auth.module';
import { UserEntity, UserSchema } from 'src/schema/User.model';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
