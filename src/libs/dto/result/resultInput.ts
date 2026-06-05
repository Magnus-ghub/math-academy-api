import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsArray, IsBoolean } from 'class-validator';

@InputType()
export class AnswerInput {
  @Field()
  @IsString()
  questionId: string;

  @Field(() => Int)
  @IsInt()
  selectedAnswer: number;

  @Field(() => Int)
  @IsInt()
  timeSpent: number;
}

@InputType()
export class ResultInput {
  @Field()
  @IsString()
  testId: string;

  @Field(() => [AnswerInput])
  @IsArray()
  answers: AnswerInput[];

  @Field(() => Int)
  @IsInt()
  duration: number;
}