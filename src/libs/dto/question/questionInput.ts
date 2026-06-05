import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { QuestionType } from 'src/libs/enums/question.enum';

@InputType()
export class QuestionInput {
  @Field()
  @IsString()
  testId: string;

  @Field(() => QuestionType, { nullable: true })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @Field()
  @IsString()
  questionText: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionImage?: string;

  @Field(() => [String])
  @IsArray()
  options: string[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswer: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  orderIndex: number;
}
