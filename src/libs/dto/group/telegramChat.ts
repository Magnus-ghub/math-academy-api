import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TelegramChatOption {
  @Field()
  chatId: string;

  @Field()
  title: string;

  @Field()
  type: string;

  @Field(() => String, { nullable: true })
  username?: string | null;

  @Field(() => String, { nullable: true })
  addedByName?: string | null;

  // Shu chat allaqachon biror guruhga ulangan bo'lsa — o'sha guruh nomi
  @Field(() => String, { nullable: true })
  linkedGroupName?: string | null;

  @Field()
  updatedAt: Date;
}
