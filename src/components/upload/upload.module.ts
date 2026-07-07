import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadController } from './upload.controller';
import { QuestionEntity, QuestionSchema } from '../../schema/Question.model';
import { TestEntity, TestSchema } from '../../schema/Test.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuestionEntity.name, schema: QuestionSchema },
      { name: TestEntity.name, schema: TestSchema },
    ]),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
