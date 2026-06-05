import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { LeaderboardType } from 'src/libs/enums/result.enum';


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
  totalTests: number;   

  @Field(() => Int)
  duration: number;      
}

@ObjectType()
export class Leaderboard {
  @Field(() => LeaderboardType)
  leaderboardType: LeaderboardType;

  @Field({ nullable: true })
  testId?: string;       

  @Field(() => [LeaderboardEntry])
  top: LeaderboardEntry[];

  @Field({ nullable: true })
  myRank?: LeaderboardEntry;  
}