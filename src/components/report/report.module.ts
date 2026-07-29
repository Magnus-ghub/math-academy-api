import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PubSub } from 'graphql-subscriptions';
import { ReportService } from './report.service';
import { ReportResolver } from './report.resolver';
import { ReportEntity, ReportSchema } from '../../schema/Report.model';
import { TestEntity, TestSchema } from '../../schema/Test.model';
import { QuestionEntity, QuestionSchema } from '../../schema/Question.model';
import { UserEntity, UserSchema } from '../../schema/User.model';
import { ResultsModule } from '../results/results.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportEntity.name, schema: ReportSchema },
      { name: TestEntity.name, schema: TestSchema },
      { name: QuestionEntity.name, schema: QuestionSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
    ResultsModule,
    TelegramBotModule,
  ],
  providers: [
    ReportService,
    ReportResolver,
    { provide: 'PUB_SUB', useValue: new PubSub() },
  ],
  exports: [ReportService],
})
export class ReportModule {}
