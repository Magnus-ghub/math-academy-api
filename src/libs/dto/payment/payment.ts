import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from 'src/libs/enums/payment.enum';

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  userName?: string;

  @Field({ nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  groupId?: string;

  @Field({ nullable: true })
  testId?: string;

  @Field({ nullable: true })
  testTitle?: string;

  @Field(() => PaymentType)
  paymentType: PaymentType;

  @Field(() => PaymentProvider)
  paymentProvider: PaymentProvider;

  @Field(() => PaymentStatus)
  paymentStatus: PaymentStatus;

  @Field(() => Int)
  amount: number; // so'mda

  @Field(() => Int, { nullable: true })
  platformFee?: number; // CLICK komissiyasi (faqat TOPUP+CLICK uchun)

  @Field({ nullable: true })
  clickTransactionId?: string;

  @Field({ nullable: true })
  receiptUrl?: string;

  @Field({ nullable: true })
  studentNote?: string;

  @Field({ nullable: true })
  adminReply?: string;

  @Field({ nullable: true })
  confirmedAt?: Date;

  @Field({ nullable: true })
  confirmedBy?: string;

  @Field()
  createdAt: Date;
}
