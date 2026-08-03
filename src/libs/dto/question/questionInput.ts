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
  @Min(-1)
  correctAnswer: number;

  // Faqat TWO_PART turida ishlatiladi (Milliy Sertifikat) — ikkinchi mustaqil javob
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  correctAnswerB?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  analysis?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  section?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  orderIndex: number;
}
