import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsService } from './results.service';
import { ResultsResolver } from './results.resolver';
import { ResultEntity } from '../../schema/Result.model';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';

@Module({
  imports: [TypeOrmModule.forFeature([ResultEntity, TestEntity, QuestionEntity])],
  providers: [ResultsService, ResultsResolver],
  exports: [ResultsService],
})
export class ResultsModule {}