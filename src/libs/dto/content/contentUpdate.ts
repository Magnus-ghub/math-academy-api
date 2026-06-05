import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentStatus } from 'src/libs/enums/content.enum';

@InputType()
export class ContentUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contentTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contentDesc?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contentImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contentVideo?: string;

  @Field(() => ContentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ContentStatus)
  contentStatus?: ContentStatus;
}