import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestsService } from './tests.service';
import { TestsResolver } from './tests.resolver';
import { TestEntity, TestSchema } from '../../schema/Test.model';
import { QuestionEntity, QuestionSchema } from '../../schema/Question.model';
import {
  UserGroupEntity,
  UserGroupSchema,
} from '../../schema/User_Group.model';
import { ResultEntity, ResultSchema } from '../../schema/Result.model';
import { PaymentEntity, PaymentSchema } from '../../schema/Payment.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestEntity.name, schema: TestSchema },
      { name: QuestionEntity.name, schema: QuestionSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
      { name: ResultEntity.name, schema: ResultSchema },
      { name: PaymentEntity.name, schema: PaymentSchema },
    ]),
    NotificationsModule,
  ],
  providers: [TestsService, TestsResolver],
  exports: [TestsService],
})
export class TestsModule {}
