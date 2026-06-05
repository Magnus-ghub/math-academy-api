import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserAuthType } from 'src/libs/enums/user.enum';

@InputType()
export class UserInput {
  @Field(() => UserAuthType)
  @IsEnum(UserAuthType)
  userAuthType: UserAuthType;

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
  telegramId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  googleId?: string;
}