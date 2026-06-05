import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentProvider, PaymentType } from 'src/libs/enums/payment.enum';

@InputType()
export class PaymentInput {
  @Field(() => PaymentType)
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @Field(() => PaymentProvider)
  @IsEnum(PaymentProvider)
  paymentProvider: PaymentProvider;

  @Field(() => Int)
  @IsInt()
  @Min(1000)
  amount: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupId?: string;
}