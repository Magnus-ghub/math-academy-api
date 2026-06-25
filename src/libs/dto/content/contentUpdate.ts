import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentStatus, ContentType } from 'src/libs/enums/content.enum';

@InputType()
export class ContentUpdate {
  @Field(() => ContentType, { nullable: true })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaJson?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupId?: string;
}