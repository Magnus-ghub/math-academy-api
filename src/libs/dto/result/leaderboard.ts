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

  @Field(() => Int, { nullable: true })
  satScore?: number | null;

  @Field(() => Int, { nullable: true })
  rawPoints?: number | null;

  @Field(() => Int, { nullable: true })
  totalPoints?: number | null;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  duration: number;
}