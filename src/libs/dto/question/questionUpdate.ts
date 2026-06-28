import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsArray, Min, Max } from 'class-validator';

@InputType()
export class QuestionUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionImage?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  options?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  correctAnswer?: number;

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
}