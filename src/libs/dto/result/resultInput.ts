import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsArray, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class AnswerInput {
  @Field()
  @IsString()
  questionId: string;

  @Field(() => Int)
  @IsInt()
  selectedAnswer: number;

  // Faqat TWO_PART turidagi savollarda (Milliy Sertifikat) — ikkinchi javob
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  selectedAnswerB?: number;

  // Talaba qog'ozga yozganidek kiritgan xom matn (masalan "√7") — faqat
  // TWO_PART savollarida, admin keyinchalik qo'lda ko'rib chiqishi uchun.
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  selectedAnswerText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  selectedAnswerBText?: string;

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