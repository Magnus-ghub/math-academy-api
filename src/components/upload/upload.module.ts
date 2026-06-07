import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { QuestionEntity } from '../../schema/Question.model';
import { TestEntity } from '../../schema/Test.model';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionEntity, TestEntity])],
  controllers: [UploadController],
})
export class UploadModule {}