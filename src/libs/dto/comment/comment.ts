import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { CommentType, CommentStatus } from '../../enums/comment.enum';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field(() => CommentType)
  commentType: CommentType;

  @Field(() => CommentStatus)
  commentStatus: CommentStatus;

  @Field()
  text: string;

  @Field(() => Int, { nullable: true })
  rating?: number;

  @Field()
  userId: string;

  @Field({ nullable: true })
  testId?: string;

  @Field()
  createdAt: Date;
}