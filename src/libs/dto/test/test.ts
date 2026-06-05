import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { TestType, TestAccess, TestStatus, TestBlock } from 'src/libs/enums/test.enum';

@ObjectType()
export class Test {
  @Field(() => ID)
  id: string;

  @Field(() => TestType)
  testType: TestType;

  @Field(() => TestAccess)
  testAccess: TestAccess;

  @Field(() => TestStatus)
  testStatus: TestStatus;

  @Field(() => TestBlock, { nullable: true })
  testBlock?: TestBlock;

  @Field()
  testTitle: string;

  @Field({ nullable: true })
  testDesc?: string;

  @Field({ nullable: true })
  testImage?: string;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  duration: number;

  @Field({ nullable: true })
  groupId?: string;

  @Field()
  createdBy: string;

  @Field(() => Int)
  totalAttempts: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
