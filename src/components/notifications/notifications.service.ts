import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationEntity,
  NotificationDocument,
} from '../../schema/Notification.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../schema/User_Group.model';
import { TestDocument } from '../../schema/Test.model';
import { NotificationType } from '../../libs/enums/notification.enum';
import { UserRole, UserStatus } from '../../libs/enums/user.enum';
import { TestAccess } from '../../libs/enums/test.enum';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationEntity.name)
    private notificationModel: Model<NotificationDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    private telegramBotService: TelegramBotService,
  ) {}

  // Test nashr qilinganda tegishli talabalarga bildirishnoma yaratadi va
  // Telegram orqali xabar yuboradi — GROUP testlar uchun faqat shu guruh
  // a'zolariga (muddati o'tmagan), PUBLIC/PREMIUM uchun barcha faol talabalarga.
  async notifyTestPublished(test: TestDocument): Promise<void> {
    let userIds: string[];

    if (test.testAccess === TestAccess.GROUP && test.groupId) {
      const memberships = await this.userGroupModel.find(
        { groupId: test.groupId, expiresAt: { $gt: new Date() } },
        'userId',
      );
      userIds = memberships.map((m) => m.userId);
    } else {
      const students = await this.userModel.find(
        {
          userRole: { $in: [UserRole.STUDENT, UserRole.ACADEM_STUDENT] },
          userStatus: UserStatus.ACTIVE,
        },
        '_id',
      );
      userIds = students.map((s) => s.id);
    }

    if (!userIds.length) return;

    const title = "Yangi test qo'shildi!";
    const message = `"${test.testTitle}" testi endi mavjud — sinab ko'ring.`;

    await this.notificationModel.insertMany(
      userIds.map((userId) => ({
        userId,
        type: NotificationType.TEST_PUBLISHED,
        title,
        message,
        link: '/dashboard/tests',
        testId: String(test._id),
      })),
    );

    const recipients = await this.userModel.find(
      { _id: { $in: userIds }, telegramId: { $ne: null } },
      '_id telegramId',
    );

    const results = await Promise.allSettled(
      recipients.map((u) =>
        this.telegramBotService.notifyUser(
          u.telegramId!,
          `📚 <b>${title}</b>\n\n${message}`,
          { label: '📚 Testlar', path: '/dashboard/tests' },
        ),
      ),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `Test e'lon qilish bildirishnomasi: ${failed}/${recipients.length} Telegram xabari yuborilmadi`,
      );
    }
  }

  async getMyNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async getMyUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDocument | null> {
    return this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true },
    );
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
    return true;
  }
}
