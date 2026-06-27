import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserAuthType, UserRole, UserStatus } from 'src/libs/enums/user.enum';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field(() => UserRole)
  userRole: UserRole;

  @Field(() => UserStatus)
  userStatus: UserStatus;

  @Field(() => UserAuthType)
  userAuthType: UserAuthType;

  @Field({ nullable: true })
  userPhone?: string;

  @Field(() => String, { nullable: true })
  userName?: string;

  @Field(() => String, { nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  userImage?: string;

  @Field(() => String, { nullable: true })
  userAddress?: string;

  @Field(() => String, { nullable: true })
  userDesc?: string;

  @Field({ nullable: true })
  userEmail?: string;

  @Field({ nullable: true })
  hasPassword?: boolean;

  @Field({ nullable: true })
  telegramId?: string;

  @Field({ nullable: true })
  googleId?: string;

  @Field({ nullable: true })
  premiumExpiresAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
