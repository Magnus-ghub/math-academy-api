import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  BroadcastAudience,
  BroadcastMediaType,
  BroadcastStatus,
} from '../../enums/broadcast.enum';

@ObjectType()
export class Broadcast {
  @Field(() => ID)
  id: string;

  @Field()
  message: string;

  @Field(() => BroadcastMediaType, { nullable: true })
  mediaType?: BroadcastMediaType;

  @Field(() => BroadcastAudience)
  audience: BroadcastAudience;

  @Field({ nullable: true })
  groupId?: string;

  @Field({ nullable: true })
  groupName?: string;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  sent: number;

  @Field(() => Int)
  failed: number;

  @Field(() => BroadcastStatus)
  status: BroadcastStatus;

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field()
  createdAt: Date;
}
