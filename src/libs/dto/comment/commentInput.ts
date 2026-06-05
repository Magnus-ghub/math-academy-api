import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { CommentType } from '../../enums/comment.enum';

@InputType()
export class CommentInput {
  @Field(() => CommentType)
  @IsEnum(CommentType)
  commentType: CommentType;

  @Field()
  @IsString()
  text: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testId?: string;
}