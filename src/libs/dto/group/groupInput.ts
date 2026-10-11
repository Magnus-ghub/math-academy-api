import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsDate } from 'class-validator';
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

  // Kurs tugaydigan sana — barcha a'zolarning kirish huquqi shu vaqtda tugaydi
  @Field(() => Date)
  @IsDate()
  endDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  groupDesc?: string;
}
