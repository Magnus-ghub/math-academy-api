import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class LeaderboardEntry {
  @Field(() => Int)
  rank: number;

  @Field()
  userId: string;

  @Field()
  userName: string;

  @Field({ nullable: true })
  userImage?: string;

  @Field(() => Float)
  score: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  duration: number;
}