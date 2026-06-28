import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min, IsPositive } from 'class-validator';
import { TestType, TestAccess, TestBlock, TestStatus, DTMType, TestDifficulty } from 'src/libs/enums/test.enum';

@InputType()
export class TestUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testTitle?: string;

  @Field(() => TestType, { nullable: true })
  @IsOptional()
  @IsEnum(TestType)
  testType?: TestType;

  @Field(() => TestBlock, { nullable: true })
  @IsOptional()
  @IsEnum(TestBlock)
  testBlock?: TestBlock;

  @Field(() => DTMType, { nullable: true })
  @IsOptional()
  @IsEnum(DTMType)
  dtmType?: DTMType;

  @Field(() => TestDifficulty, { nullable: true })
  @IsOptional()
  @IsEnum(TestDifficulty)
  testDifficulty?: TestDifficulty;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testDesc?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testPdfUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testYoutubeUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testAnalysis?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @Field(() => TestAccess, { nullable: true })
  @IsOptional()
  @IsEnum(TestAccess)
  testAccess?: TestAccess;

  @Field(() => TestStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TestStatus)
  testStatus?: TestStatus;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  testPrice?: number;
}
