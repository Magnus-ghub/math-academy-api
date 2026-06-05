import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsResolver } from './tests.resolver';
import { TestEntity } from '../../schema/Test.model';
import { QuestionEntity } from '../../schema/Question.model';
import { UserGroupEntity } from '../../schema/User_Group.model';

@Module({
  imports: [TypeOrmModule.forFeature([TestEntity, QuestionEntity, UserGroupEntity])],
  providers: [TestsService, TestsResolver],
  exports: [TestsService],
})
export class TestsModule {}