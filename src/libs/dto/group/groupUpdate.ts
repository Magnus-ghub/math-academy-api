import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsDate } from 'class-validator';
import { GroupStatus } from 'src/libs/enums/group.enum';

@InputType()
export class GroupUpdate {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupDesc?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  // Tugash sanasi istalgan vaqtda o'zgartiriladi — mavjud a'zolar ham moslanadi
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field(() => GroupStatus, { nullable: true })
  @IsOptional()
  @IsEnum(GroupStatus)
  groupStatus?: GroupStatus;

  @Field({ nullable: true })
  @IsOptional()
  endedAt?: Date;
}
