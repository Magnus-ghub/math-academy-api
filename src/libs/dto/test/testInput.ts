import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TestType, TestAccess, TestBlock, DTMType, TestDifficulty } from 'src/libs/enums/test.enum';

@InputType()
export class TestInput {
  @Field(() => TestType)
  @IsEnum(TestType)
  testType: TestType;

  @Field(() => TestAccess)
  @IsEnum(TestAccess)
  testAccess: TestAccess;

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

  @Field()
  @IsString()
  testTitle: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testDesc?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testImage?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  duration: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupId?: string;
}
