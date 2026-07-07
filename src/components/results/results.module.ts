import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultsService } from './results.service';
import { ResultsResolver } from './results.resolver';
import { ResultEntity, ResultSchema } from '../../schema/Result.model';
import { TestEntity, TestSchema } from '../../schema/Test.model';
import { QuestionEntity, QuestionSchema } from '../../schema/Question.model';
import { UserEntity, UserSchema } from '../../schema/User.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ResultEntity.name, schema: ResultSchema },
      { name: TestEntity.name, schema: TestSchema },
      { name: QuestionEntity.name, schema: QuestionSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  providers: [ResultsService, ResultsResolver],
  exports: [ResultsService],
})
export class ResultsModule {}
