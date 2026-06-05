import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class UserUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userLastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userDesc?: string;
}