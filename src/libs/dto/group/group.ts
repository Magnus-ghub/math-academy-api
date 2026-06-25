import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { GroupType, GroupStatus } from 'src/libs/enums/group.enum';
import { UserRole, UserStatus, UserAuthType } from 'src/libs/enums/user.enum';

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

@ObjectType()
export class GroupMember {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  userName?: string;

  @Field({ nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  userImage?: string;

  @Field({ nullable: true })
  telegramId?: string;

  @Field({ nullable: true })
  userPhone?: string;

  @Field(() => UserRole)
  userRole: UserRole;

  @Field(() => UserAuthType)
  userAuthType: UserAuthType;

  @Field()
  expiresAt: Date;

  @Field()
  joinedAt: Date;
}

@ObjectType()
export class UserGroup {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  groupId: string;

  @Field(() => GroupType)
  groupType: GroupType;

  @Field()
  expiresAt: Date;

  @Field()
  joinedAt: Date;

  @Field({ nullable: true })
  groupName?: string;
}
