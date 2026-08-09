import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ResultStatus } from '../../enums/result.enum';

@ObjectType()
export class AdminResultRow {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  testTitle?: string;

  @Field({ nullable: true })
  testType?: string;

  @Field({ nullable: true })
  userName?: string;

  @Field({ nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  userPhone?: string;

  @Field({ nullable: true })
  userEmail?: string;

  @Field(() => ResultStatus)
  resultStatus: ResultStatus;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Float)
  score: number;

  @Field(() => Int, { nullable: true })
  satScore?: number | null;

  @Field(() => Int, { nullable: true })
  rawPoints?: number | null;

  @Field(() => Int, { nullable: true })
  totalPoints?: number | null;

  @Field(() => Int)
  duration: number;

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field()
  createdAt: Date;
}
