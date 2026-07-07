import { ObjectType, Field, ID } from '@nestjs/graphql';
import { RecoveryStatus } from '../../enums/recovery.enum';

@ObjectType()
export class RecoveryRequest {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  telegramUsername?: string;

  @Field()
  message: string;

  @Field(() => RecoveryStatus)
  status: RecoveryStatus;

  @Field()
  createdAt: Date;
}
