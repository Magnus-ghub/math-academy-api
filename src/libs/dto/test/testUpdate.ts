import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TestAccess, TestBlock, TestStatus } from 'src/libs/enums/test.enum';

@InputType()
export class TestUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testTitle?: string;

  @Field(() => TestBlock, { nullable: true })
  @IsOptional()
  @IsEnum(TestBlock)
  testBlock?: TestBlock;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testDesc?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  testImage?: string;

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
}
