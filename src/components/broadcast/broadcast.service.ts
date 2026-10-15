import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BroadcastEntity,
  BroadcastDocument,
} from '../../schema/Broadcast.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../schema/User_Group.model';
import {
  BroadcastAudience,
  BroadcastMediaType,
  BroadcastStatus,
} from '../../libs/enums/broadcast.enum';
import { GroupStatus } from '../../libs/enums/group.enum';
import { UserRole, UserStatus } from '../../libs/enums/user.enum';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import type { BroadcastPayload, BroadcastRequest } from './broadcast.types';

// Telegram bot uchun umumiy limit ~30 xabar/sekund — biroz pastroq tezlikda
// ketma-ket yuboramiz, shunda 429 xatolari deyarli chiqmaydi.
const SEND_INTERVAL_MS = 40;
// Hisoblagichlar DB ga har shuncha xabardan keyin yoziladi (admin sahifasi
// shu orqali jarayonni ko'radi)
const PROGRESS_FLUSH_EVERY = 25;
const MAX_TEXT_LENGTH = 4096;
const MAX_CAPTION_LENGTH = 1024;

@Injectable()
export class BroadcastService implements OnModuleInit {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectModel(BroadcastEntity.name)
    private broadcastModel: Model<BroadcastDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    // TelegramBotService ham /elon uchun shu servisdan foydalanadi
    @Inject(forwardRef(() => TelegramBotService))
    private telegramBotService: TelegramBotService,
  ) {}

  // Yuborish xotirada (fon jarayonida) ketadi — server qayta ishga tushsa,
  // tugallanmay qolgan e'lonlar abadiy "yuborilmoqda" bo'lib turmasligi kerak.
  async onModuleInit() {
    await this.broadcastModel.updateMany(
      { status: BroadcastStatus.SENDING },
      { $set: { status: BroadcastStatus.INTERRUPTED, finishedAt: new Date() } },
    );
  }

  async getBroadcasts(): Promise<BroadcastDocument[]> {
    return this.broadcastModel.find().sort({ createdAt: -1 }).limit(20);
  }

  async getActiveGroups(): Promise<{ id: string; groupName: string }[]> {
    const groups = await this.groupModel
      .find({ groupStatus: GroupStatus.ACTIVE }, 'groupName')
      .sort({ createdAt: -1 });
    return groups.map((g) => ({ id: g.id, groupName: g.groupName }));
  }

  async countRecipients(
    adminId: string,
    audience: BroadcastAudience,
    groupId?: string | null,
  ): Promise<number> {
    return (await this.resolveRecipients(adminId, audience, groupId)).length;
  }

  // Admin panel uchun: yuklangan faylni Telegram'ga joylab, file_id qaytaradi
  async uploadMedia(
    adminId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<{ mediaType: BroadcastMediaType; mediaFileId: string }> {
    const mediaType = file.mimetype.startsWith('image/')
      ? BroadcastMediaType.PHOTO
      : BroadcastMediaType.VIDEO;
    // Bot API limiti: rasm 10 MB, video 50 MB
    if (
      mediaType === BroadcastMediaType.PHOTO &&
      file.size > 10 * 1024 * 1024
    ) {
      throw new BadRequestException('Rasm hajmi 10 MB dan oshmasligi kerak');
    }

    const admin = await this.userModel.findById(adminId, 'telegramId');
    if (!admin?.telegramId) {
      throw new BadRequestException(
        "Media yuklash uchun hisobingizga Telegram bog'langan bo'lishi kerak",
      );
    }

    const mediaFileId = await this.telegramBotService.uploadBroadcastMedia(
      admin.telegramId,
      mediaType,
      file,
    );
    return { mediaType, mediaFileId };
  }

  // E'lonni yaratadi va darhol qaytaradi — xabarlar fonda yuboriladi, chunki
  // minglab foydalanuvchiga yuborish so'rov vaqtidan ancha uzoq davom etadi.
  async startBroadcast(
    adminId: string,
    request: BroadcastRequest,
  ): Promise<BroadcastDocument> {
    const payload = this.validatePayload(request);

    const isTest = request.audience === BroadcastAudience.ME;
    if (!isTest) {
      // Ikki e'lon parallel ketsa, Telegram limiti ikki barobar tez to'lib qoladi
      const running = await this.broadcastModel.exists({
        status: BroadcastStatus.SENDING,
        audience: { $ne: BroadcastAudience.ME },
      });
      if (running) {
        throw new BadRequestException(
          "Oldingi e'lon hali yuborilmoqda — tugashini kuting",
        );
      }
    }

    let groupName: string | null = null;
    if (request.audience === BroadcastAudience.GROUP) {
      if (!request.groupId) throw new BadRequestException('Guruhni tanlang');
      const group = await this.groupModel.findById(
        request.groupId,
        'groupName',
      );
      if (!group) throw new BadRequestException('Guruh topilmadi');
      groupName = group.groupName;
    }

    const telegramIds = await this.resolveRecipients(
      adminId,
      request.audience,
      request.groupId,
    );
    if (!telegramIds.length) {
      throw new BadRequestException(
        isTest
          ? "Hisobingizga Telegram bog'lanmagan"
          : "Tanlangan auditoriyada Telegram bog'langan foydalanuvchi yo'q",
      );
    }

    const broadcast = await this.broadcastModel.create({
      ...payload,
      audience: request.audience,
      groupId: groupName ? request.groupId : null,
      groupName,
      createdBy: adminId,
      total: telegramIds.length,
    });

    void this.deliver(broadcast.id, adminId, telegramIds, payload, isTest);
    return broadcast;
  }

  private validatePayload(request: BroadcastRequest): BroadcastPayload {
    const hasMedia = !!request.mediaType;
    if (hasMedia && !request.mediaFileId) {
      throw new BadRequestException('Media fayli topilmadi — qayta yuklang');
    }
    // Formatlash (entities) belgilar o'rniga bog'langan — matn bo'lsa, uni
    // o'zgartirmaymiz; admin paneldan kelgan matn esa chetidagi bo'shliqlardan tozalanadi
    const message = request.entities?.length
      ? request.message
      : request.message.trim();

    if (!message && !hasMedia) {
      throw new BadRequestException("E'lon matni bo'sh bo'lmasligi kerak");
    }
    const limit = hasMedia ? MAX_CAPTION_LENGTH : MAX_TEXT_LENGTH;
    if (message.length > limit) {
      throw new BadRequestException(
        hasMedia
          ? `Rasm/video izohi ${MAX_CAPTION_LENGTH} belgidan oshmasligi kerak`
          : `Matn ${MAX_TEXT_LENGTH} belgidan oshmasligi kerak`,
      );
    }

    return {
      message,
      entities: request.entities?.length ? request.entities : null,
      mediaType: request.mediaType ?? null,
      mediaFileId: hasMedia ? request.mediaFileId : null,
    };
  }

  private async resolveRecipients(
    adminId: string,
    audience: BroadcastAudience,
    groupId?: string | null,
  ): Promise<string[]> {
    const filter: Record<string, unknown> = {
      userStatus: UserStatus.ACTIVE,
      telegramId: { $type: 'string' },
    };

    switch (audience) {
      case BroadcastAudience.ME:
        filter._id = adminId;
        break;
      case BroadcastAudience.STUDENTS:
        filter.userRole = { $in: [UserRole.STUDENT, UserRole.ACADEM_STUDENT] };
        break;
      case BroadcastAudience.TEACHERS:
        filter.userRole = UserRole.TEACHER;
        break;
      case BroadcastAudience.GROUP: {
        // Faqat a'zoligi hali tugamaganlar
        const memberships = await this.userGroupModel.find(
          { groupId, expiresAt: { $gt: new Date() } },
          'userId',
        );
        filter._id = { $in: memberships.map((m) => m.userId) };
        break;
      }
      case BroadcastAudience.ALL:
        break;
    }

    const users = await this.userModel.find(filter, 'telegramId');
    return [...new Set(users.map((u) => u.telegramId!))];
  }

  private async deliver(
    broadcastId: string,
    adminId: string,
    telegramIds: string[],
    payload: BroadcastPayload,
    isTest: boolean,
  ) {
    let sent = 0;
    let failed = 0;
    let status = BroadcastStatus.DONE;

    try {
      for (let i = 0; i < telegramIds.length; i++) {
        const ok = await this.telegramBotService.sendBroadcastMessage(
          telegramIds[i],
          payload,
        );
        if (ok) sent++;
        else failed++;

        if ((i + 1) % PROGRESS_FLUSH_EVERY === 0) {
          await this.broadcastModel.updateOne(
            { _id: broadcastId },
            { $set: { sent, failed } },
          );
        }
        await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
      }
    } catch (err) {
      this.logger.error(`E'lon yuborishda xato (id=${broadcastId})`, err);
      status = BroadcastStatus.INTERRUPTED;
    }

    await this.broadcastModel
      .updateOne(
        { _id: broadcastId },
        { $set: { sent, failed, status, finishedAt: new Date() } },
      )
      .catch((err) => this.logger.error("E'lon holatini saqlab bo'lmadi", err));

    if (!isTest) await this.reportToAdmin(adminId, sent, failed, status);
  }

  // Yuborgan adminga Telegram orqali yakuniy hisobot
  private async reportToAdmin(
    adminId: string,
    sent: number,
    failed: number,
    status: BroadcastStatus,
  ) {
    const admin = await this.userModel
      .findById(adminId, 'telegramId')
      .catch(() => null);
    if (!admin?.telegramId) return;

    const title =
      status === BroadcastStatus.DONE
        ? "✅ E'lon yuborildi"
        : "⚠️ E'lon yuborish to'xtab qoldi";
    const lines = [title, '', `Yetkazildi: ${sent}`];
    if (failed > 0) {
      lines.push(
        `Yetkazilmadi: ${failed} (botni bloklagan yoki /start bosmagan)`,
      );
    }
    await this.telegramBotService.sendBroadcastMessage(admin.telegramId, {
      message: lines.join('\n'),
    });
  }
}
