import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PubSub } from 'graphql-subscriptions';
import { PaymentsService } from './payments.service';
import { PaymentsResolver } from './payments.resolver';
import { PaymentEntity, PaymentSchema } from '../../schema/Payment.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import {
  UserGroupEntity,
  UserGroupSchema,
} from '../../schema/User_Group.model';
import { GroupEntity, GroupSchema } from '../../schema/Group.model';
import { TestEntity, TestSchema } from '../../schema/Test.model';
import { PaymentsController } from './payments.controller';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentEntity.name, schema: PaymentSchema },
      { name: UserEntity.name, schema: UserSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
      { name: GroupEntity.name, schema: GroupSchema },
      { name: TestEntity.name, schema: TestSchema },
    ]),
    TelegramBotModule,
  ],
  providers: [
    PaymentsService,
    PaymentsResolver,
    { provide: 'PUB_SUB', useValue: new PubSub() },
  ],
  exports: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
