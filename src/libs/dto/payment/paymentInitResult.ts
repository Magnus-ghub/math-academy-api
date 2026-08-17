import { ObjectType, Field } from '@nestjs/graphql';
import { Payment } from './payment';

@ObjectType()
export class ClickPaymentInitResult {
  @Field(() => Payment)
  payment: Payment;

  @Field()
  payUrl: string;
}
