import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

@InputType()
export class RecoveryRequestInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @Field()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegramUsername?: string;

  @Field()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  message: string;
}
