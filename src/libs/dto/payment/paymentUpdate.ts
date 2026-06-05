import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from 'src/libs/enums/payment.enum';

@InputType()
export class PaymentUpdate {
  @Field(() => PaymentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  clickTransactionId?: string;
}