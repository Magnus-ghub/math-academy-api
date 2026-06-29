import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { ReportService } from './report.service';
import { ReportResolver } from './report.resolver';
import { ReportEntity } from '../../schema/Report.model';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';

@Module({
  imports: [TypeOrmModule.forFeature([ReportEntity, TestEntity, QuestionEntity])],
  providers: [
    ReportService,
    ReportResolver,
    { provide: 'PUB_SUB', useValue: new PubSub() },
  ],
  exports: [ReportService],
})
export class ReportModule {}