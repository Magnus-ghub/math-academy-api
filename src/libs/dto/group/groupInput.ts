import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { GroupType } from 'src/libs/enums/group.enum';

@InputType()
export class GroupInput {
  @Field(() => GroupType)
  @IsEnum(GroupType)
  groupType: GroupType;

  @Field()
  @IsString()
  groupName: string;

  @Field()
  @IsString()
  telegramChatId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(6)
  durationMonths: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupDesc?: string;
}