import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  durationMonths?: number;

  @Field(() => GroupStatus, { nullable: true })
  @IsOptional()
  @IsEnum(GroupStatus)
  groupStatus?: GroupStatus;

  @Field({ nullable: true })
  @IsOptional()
  endedAt?: Date;
}
