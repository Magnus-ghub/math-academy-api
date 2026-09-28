import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegramChatEntity, TelegramChatDocument } from '../../schema/TelegramChat.model';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { TelegramChatOption } from '../../libs/dto/group/telegramChat';
import { callTelegram, getTelegramBotToken } from '../../libs/utils/telegramApi.util';

export interface TrackedChatInput {
  chatId: string;
  title: string;
  type: string;
  username?: string | null;
  botStatus: string;
  addedByTelegramId?: string | null;
  addedByName?: string | null;
}

@Injectable()
export class TelegramChatsService {
  private botIdCache: number | null = null;

  constructor(
    private config: ConfigService,
    @InjectModel(TelegramChatEntity.name)
    private telegramChatModel: Model<TelegramChatDocument>,
    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,
  ) {}

  private get token() {
    return getTelegramBotToken(this.config);
  }

  private async getBotId(): Promise<number> {
    if (this.botIdCache) return this.botIdCache;
    const me = await callTelegram<{ id: number }>(this.token, 'getMe', {});
    if (!me.ok || !me.result) throw new Error(`getMe failed: ${me.description}`);
    this.botIdCache = me.result.id;
    return this.botIdCache;
  }

  // Bot handler'lari (my_chat_member, "/ulash") chaqiradi. "Kim qo'shgan"
  // faqat birinchi marta yoziladi — keyingi yangilanishlar uni o'chirmaydi.
  async trackChat(input: TrackedChatInput): Promise<void> {
    const { addedByTelegramId, addedByName, ...rest } = input;
    await this.telegramChatModel.updateOne(
      { chatId: input.chatId },
      {
        $set: rest,
        $setOnInsert: {
          addedByTelegramId: addedByTelegramId ?? null,
          addedByName: addedByName ?? null,
        },
      },
      { upsert: true },
    );
  }

  // Bot hozir shu chatda admin'mi — Telegram'dan to'g'ridan-to'g'ri so'raydi.
  async getBotStatus(chatId: string): Promise<string | null> {
    const res = await callTelegram<{ status: string }>(this.token, 'getChatMember', {
      chat_id: chatId,
      user_id: await this.getBotId(),
    });
    return res.ok ? res.result!.status : null;
  }

  // Guruh yaratish/tahrirlashda: bot shu chatda admin bo'lmasa, talabalarning
  // a'zoligini (getChatMember) tekshira olmaydi — shuning uchun rad etamiz.
  // Tekshiruvdan o'tgan chat ro'yxatga ham yoziladi (nomi bilan).
  async assertBotIsAdmin(chatId: string): Promise<void> {
    const chat = await callTelegram<{ id: number; title?: string; type: string; username?: string }>(
      this.token,
      'getChat',
      { chat_id: chatId },
    );
    if (!chat.ok || !chat.result) {
      throw new BadRequestException(
        "Bot bu Telegram chatni topa olmadi. Chat ID to'g'riligini va bot kanalga qo'shilganini tekshiring.",
      );
    }
    const status = await this.getBotStatus(chatId);
    if (status !== 'administrator' && status !== 'creator') {
      throw new BadRequestException(
        "Bot bu kanal/guruhda admin emas. Botni admin qilib, qaytadan urinib ko'ring.",
      );
    }
    await this.trackChat({
      chatId: String(chat.result.id),
      title: chat.result.title ?? String(chat.result.id),
      type: chat.result.type,
      username: chat.result.username ?? null,
      botStatus: status,
    });
  }

  // Admin panel uchun: bot admin bo'lgan chatlar. Nomlar Telegram'dan
  // yangilanadi; bot chiqarib yuborilgan bo'lsa (yangilanish kelmay qolgan
  // holatlar ham) ro'yxatdan tushadi.
  async listAdminChats(): Promise<TelegramChatOption[]> {
    const chats = await this.telegramChatModel
      .find({ botStatus: { $in: ['administrator', 'creator'] } })
      .lean();

    const refreshed = await Promise.all(
      chats.map(async (c) => {
        const info = await callTelegram<{ title?: string; username?: string }>(this.token, 'getChat', {
          chat_id: c.chatId,
        }).catch(() => null);
        if (!info?.ok) {
          // Chat o'chirilgan yoki bot chiqarilgan
          await this.telegramChatModel.updateOne({ _id: c._id }, { $set: { botStatus: 'left' } });
          return null;
        }
        const title = info.result?.title ?? c.title;
        const username = info.result?.username ?? null;
        if (title !== c.title || username !== c.username) {
          await this.telegramChatModel.updateOne({ _id: c._id }, { $set: { title, username } });
        }
        return { ...c, title, username };
      }),
    );

    const alive = refreshed.filter((c) => c !== null);
    const groups = await this.groupModel.find(
      { telegramChatId: { $in: alive.map((c) => c.chatId) } },
      'telegramChatId groupName',
    );
    const linked = new Map(groups.map((g) => [g.telegramChatId, g.groupName]));

    return alive
      .map((c) => ({
        chatId: c.chatId,
        title: c.title,
        type: c.type,
        username: c.username,
        addedByName: c.addedByName,
        linkedGroupName: linked.get(c.chatId) ?? null,
        updatedAt: c.updatedAt,
      }))
      // Bo'sh (ulanmagan) chatlar oldinda, har biri ichida eng yangisi birinchi
      .sort(
        (a, b) =>
          Number(!!a.linkedGroupName) - Number(!!b.linkedGroupName) ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}
