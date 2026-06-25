import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentType } from 'src/libs/enums/content.enum';

@InputType()
export class ContentInput {
  @Field(() => ContentType)
  @IsEnum(ContentType)
  contentType: ContentType;

  @Field()
  @IsString()
  contentTitle: string;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaJson?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupId?: string;
}