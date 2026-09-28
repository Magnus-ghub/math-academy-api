import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelegramChatDocument = HydratedDocument<TelegramChatEntity>;

// Bot qo'shilgan Telegram kanal/guruhlar. Bot API'da "bot qaysi chatlarda
// bor" degan metod yo'q — shu sabab bot my_chat_member (qo'shildi / admin
// qilindi / chiqarildi) yangilanishlarini va kanaldagi "/ulash" postini shu
// yerga yozib boradi. Admin guruh yaratishda chat ID'ni qo'lda qidirmay, shu
// ro'yxatdan tanlaydi.
@Schema({ timestamps: true, collection: 'telegram_chats' })
export class TelegramChatEntity {
  @Prop({ type: String, required: true, unique: true })
  chatId: string;

  @Prop({ type: String, required: true })
  title: string;

  // "channel" | "supergroup" | "group"
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, default: null })
  username: string | null;

  // Botning shu chatdagi holati: "administrator" | "member" | "left" | "kicked" ...
  @Prop({ type: String, required: true })
  botStatus: string;

  @Prop({ type: String, default: null })
  addedByTelegramId: string | null;

  @Prop({ type: String, default: null })
  addedByName: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const TelegramChatSchema = SchemaFactory.createForClass(TelegramChatEntity);
