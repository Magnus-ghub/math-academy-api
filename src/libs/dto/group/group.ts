import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { GroupType, GroupStatus } from 'src/libs/enums/group.enum';

@ObjectType()
export class Group {
  @Field(() => ID)
  id: string;

  @Field(() => GroupType)
  groupType: GroupType;

  @Field(() => GroupStatus)
  groupStatus: GroupStatus;

  @Field()
  groupName: string;

  @Field()
  telegramChatId: string;

  @Field(() => Int)
  durationMonths: number;

  @Field({ nullable: true })
  groupDesc?: string;

  @Field(() => Int)
  memberCount: number;

  @Field({ nullable: true })
  endedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
