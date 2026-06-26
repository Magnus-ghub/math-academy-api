import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from 'src/libs/enums/user.enum';

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

@InputType()
export class AdminUserUpdate {
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

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  @IsEnum(UserStatus)
  userStatus?: UserStatus;
}
