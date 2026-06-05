import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { QuestionType } from 'src/libs/enums/question.enum';

@ObjectType()
export class Question {
  @Field(() => ID)
  id: string;

  @Field(() => QuestionType)
  questionType: QuestionType;

  @Field()
  testId: string;

  @Field()
  questionText: string;

  @Field({ nullable: true })
  questionImage?: string; // formula yoki rasm bo'lsa

  @Field(() => [String])
  options: string[]; // A, B, C, D variantlar

  @Field(() => Int)
  correctAnswer: number; // 0, 1, 2, 3 (index)

  @Field({ nullable: true })
  explanation?: string; // javob izohi (teacher yozadi)

  @Field(() => Int)
  orderIndex: number; // testdagi tartib raqami

  @Field()
  createdAt: Date;
}
