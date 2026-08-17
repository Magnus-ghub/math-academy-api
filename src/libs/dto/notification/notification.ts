import { ObjectType, Field, ID } from '@nestjs/graphql';
import { NotificationType } from '../../enums/notification.enum';

@ObjectType()
export class Notification {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field({ nullable: true })
  link?: string;

  @Field({ nullable: true })
  testId?: string;

  @Field()
  isRead: boolean;

  @Field()
  createdAt: Date;
}
