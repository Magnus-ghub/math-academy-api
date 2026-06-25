import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ContentType, ContentStatus } from 'src/libs/enums/content.enum';

@ObjectType()
export class Content {
  @Field(() => ID)
  id: string;

  @Field(() => ContentType)
  contentType: ContentType;

  @Field(() => ContentStatus)
  contentStatus: ContentStatus;

  @Field()
  contentTitle: string;

  @Field({ nullable: true })
  contentDesc?: string;

  @Field({ nullable: true })
  contentImage?: string;

  @Field({ nullable: true })
  contentVideo?: string;

  @Field({ nullable: true })
  metaJson?: string;

  @Field(() => Int)
  viewCount: number;

  @Field({ nullable: true })
  groupId?: string;

  @Field()
  createdBy: string;

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}