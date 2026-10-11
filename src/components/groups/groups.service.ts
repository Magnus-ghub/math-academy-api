import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { GroupUpdate } from '../../libs/dto/group/groupUpdate';
import { GroupStatus } from '../../libs/enums/group.enum';
import { GroupInput } from 'src/libs/dto/group/groupInput';
import { TelegramChatsService } from './telegram-chats.service';
import { computeMemberExpiresAt } from 'src/libs/utils/groupExpiry.util';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,

    private telegramChatsService: TelegramChatsService,
  ) {}

  async createGroup(input: GroupInput): Promise<GroupDocument> {
    this.assertFutureEndDate(input.endDate);
    await this.telegramChatsService.assertBotIsAdmin(input.telegramChatId);
    return this.groupModel.create(input);
  }

  private assertFutureEndDate(endDate: Date) {
    if (endDate.getTime() <= Date.now()) {
      throw new BadRequestException("Tugash sanasi kelajakdagi sana bo'lishi kerak");
    }
  }

  async updateGroup(groupId: string, input: GroupUpdate): Promise<GroupDocument> {
    if (input.telegramChatId) {
      const current = await this.getGroupById(groupId);
      if (current.telegramChatId !== input.telegramChatId) {
        await this.telegramChatsService.assertBotIsAdmin(input.telegramChatId);
      }
    }
    // Tugash sanasi belgilangach eski "N oy" qiymati (eski guruhlarda) endi
    // ishlatilmaydi — tozalanadi
    const patch: GroupUpdate & { durationMonths?: null } = { ...input };
    if (input.endDate) {
      this.assertFutureEndDate(input.endDate);
      patch.durationMonths = null;
    }
    await this.groupModel.updateOne({ _id: groupId }, { $set: patch });

    // Kurs tugash sanasi o'zgarsa — mavjud a'zolarning muddati ham shunga
    // moslanadi (uzaytirilsa ham, qisqartirilsa ham).
    if (input.endDate) {
      await this.userGroupModel.updateMany({ groupId }, { $set: { expiresAt: input.endDate } });
    }
    return this.getGroupById(groupId);
  }

  async getGroupById(groupId: string): Promise<GroupDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  // includeInactive — admin guruhlar sahifasi yopilgan guruhlarni ham ko'rishi
  // (va qayta ochishi) uchun; boshqa joylar (test yaratish va h.k.) faqat faollarini oladi
  async getAllGroups(includeInactive = false): Promise<GroupDocument[]> {
    const groups = await this.groupModel
      .find(includeInactive ? {} : { groupStatus: GroupStatus.ACTIVE })
      .sort({ createdAt: -1 });
    await this.attachMemberCounts(groups);
    return groups;
  }

  // A'zolar soni har safar user_groups'dan hisoblanadi — a'zolik bir nechta
  // joyda yaratiladi (admin qo'shishi, Telegram sinxronlash, to'lov) va
  // saqlangan hisoblagich ulardan ortda qolib, kartada "0 a'zo" ko'rinardi.
  private async attachMemberCounts(groups: GroupDocument[]) {
    if (groups.length === 0) return;
    const counts = await this.userGroupModel.aggregate<{ _id: string; count: number }>([
      { $match: { groupId: { $in: groups.map((g) => g.id) } } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    for (const group of groups) group.memberCount = countMap.get(group.id) ?? 0;
  }

  async getMyGroups(userId: string): Promise<(UserGroupDocument & { groupName: string })[]> {
    const userGroups = await this.userGroupModel.find({ userId }).sort({ joinedAt: -1 });
    if (userGroups.length === 0) return [];

    const activeGroups = await this.groupModel.find(
      { _id: { $in: userGroups.map((ug) => ug.groupId) }, groupStatus: GroupStatus.ACTIVE },
      'groupName',
    );
    const activeMap = new Map(activeGroups.map((g) => [g.id, g.groupName]));
    return userGroups
      .filter((ug) => activeMap.has(ug.groupId))
      .map((ug) => Object.assign(ug, { groupName: activeMap.get(ug.groupId)! }));
  }

  async getUsersByGroup(groupId: string): Promise<UserGroupDocument[]> {
    return this.userGroupModel.find({ groupId });
  }

  async getGroupMemberIds(groupId: string): Promise<string[]> {
    const rows = await this.userGroupModel.find({ groupId }, 'userId');
    return rows.map((r) => r.userId);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<UserGroupDocument> {
    const group = await this.getGroupById(groupId);

    const expiresAt = computeMemberExpiresAt(group);

    // Muddati o'tgan a'zolik o'chirilmay saqlanadi (tarix uchun) — qayta
    // qo'shilganda faqat muddati yangilanadi
    const existing = await this.userGroupModel.findOne({ groupId, userId });
    if (existing) {
      existing.expiresAt = expiresAt;
      return existing.save();
    }

    const saved = await this.userGroupModel.create({
      userId,
      groupId,
      groupType: group.groupType,
      expiresAt,
    });
    return saved;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
    const entry = await this.userGroupModel.findOne({ groupId, userId });
    if (!entry) return false;
    await this.userGroupModel.deleteOne({ _id: entry._id });
    return true;
  }

  async getGroupMembers(groupId: string): Promise<Array<UserEntity & { id: string; expiresAt: Date; joinedAt: Date }>> {
    const userGroups = await this.userGroupModel.find({ groupId }).sort({ joinedAt: -1 });
    if (userGroups.length === 0) return [];

    const users = await this.userModel.find({ _id: { $in: userGroups.map((ug) => ug.userId) } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return userGroups
      .filter((ug) => userMap.has(ug.userId))
      .map((ug) => ({
        ...userMap.get(ug.userId)!.toObject(),
        expiresAt: ug.expiresAt,
        joinedAt: ug.joinedAt,
      }));
  }

  async getMemberCount(groupId: string): Promise<number> {
    return this.userGroupModel.countDocuments({ groupId });
  }
}
