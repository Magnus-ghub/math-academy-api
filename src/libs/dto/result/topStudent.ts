import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class TopStudentEntry {
  @Field(() => Int)
  rank: number;

  @Field()
  userId: string;

  @Field()
  userName: string;

  @Field({ nullable: true })
  userImage?: string;

  @Field(() => Float)
  avgScore: number;

  @Field(() => Int)
  totalTests: number;
}
