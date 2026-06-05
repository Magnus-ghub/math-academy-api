import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { PaymentProvider, PaymentStatus, PaymentType } from 'src/libs/enums/payment.enum';

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  groupId?: string;       

  @Field(() => PaymentType)
  paymentType: PaymentType;

  @Field(() => PaymentProvider)
  paymentProvider: PaymentProvider;

  @Field(() => PaymentStatus)
  paymentStatus: PaymentStatus;

  @Field(() => Int)
  amount: number;         // so'mda

  @Field({ nullable: true })
  clickTransactionId?: string;

  @Field({ nullable: true })
  confirmedAt?: Date;

  @Field({ nullable: true })
  confirmedBy?: string;   

  @Field()
  createdAt: Date;
}