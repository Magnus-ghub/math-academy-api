import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ResultStatus } from 'src/libs/enums/result.enum';

@ObjectType()
export class Result {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  testId: string;

  @Field({ nullable: true })
  testTitle?: string;

  @Field({ nullable: true })
  testType?: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field(() => ResultStatus)
  resultStatus: ResultStatus;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Float)
  score: number;          // foizda, masalan 85.5

  @Field(() => Int)
  duration: number;       // necha soniyada tugatgan

  @Field(() => [AnswerDto])
  answers: AnswerDto[];   // har bir savolga javob

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AnswerDto {
  @Field()
  questionId: string;

  @Field(() => Int)
  selectedAnswer: number;  // talaba tanlagan index

  @Field()
  isCorrect: boolean;

  @Field(() => Int)
  timeSpent: number;       // shu savolga sarflangan vaqt (soniya)
}