import { InputType, ObjectType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsArray, Min } from 'class-validator';

@InputType()
export class ImportHistoricalResultsInput {
  @Field()
  @IsString()
  testId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  totalPoints: number;

  @Field(() => [Int])
  @IsArray()
  @IsInt({ each: true })
  rawScores: number[];
}

@ObjectType()
export class ImportHistoricalResultsPayload {
  @Field(() => Int)
  importedCount: number;
}
