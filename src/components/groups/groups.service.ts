import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { GroupUpdate } from '../../libs/dto/group/groupUpdate';
import { GroupStatus } from '../../libs/enums/group.enum';
import { Cron } from '@nestjs/schedule';
import { GroupInput } from 'src/libs/dto/group/groupInput';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,
  ) {}

  async createGroup(input: GroupInput): Promise<GroupDocument> {
    return this.groupModel.create(input);
  }

  async updateGroup(groupId: string, input: GroupUpdate): Promise<GroupDocument> {
    await this.groupModel.updateOne({ _id: groupId }, { $set: { ...input } });
    return this.getGroupById(groupId);
  }

  async getGroupById(groupId: string): Promise<GroupDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getAllGroups(): Promise<GroupDocument[]> {
    return this.groupModel.find({ groupStatus: GroupStatus.ACTIVE }).sort({ createdAt: -1 });
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

    const existing = await this.userGroupModel.findOne({ groupId, userId });
    if (existing) return existing;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);

    const saved = await this.userGroupModel.create({
      userId,
      groupId,
      groupType: group.groupType,
      expiresAt,
    });
    await this.groupModel.updateOne({ _id: groupId }, { $inc: { memberCount: 1 } });
    return saved;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
    const entry = await this.userGroupModel.findOne({ groupId, userId });
    if (!entry) return false;
    await this.userGroupModel.deleteOne({ _id: entry._id });
    const realCount = await this.userGroupModel.countDocuments({ groupId });
    await this.groupModel.updateOne({ _id: groupId }, { $set: { memberCount: realCount } });
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

  // Muddati o'tgan user_groups ni har kecha tozalash
  @Cron('0 0 * * *')
  async expireUserGroups() {
    const result = await this.userGroupModel.deleteMany({ expiresAt: { $lt: new Date() } });

    if (result.deletedCount > 0) {
      console.log(`Expired ${result.deletedCount} user_groups`);
    }
  }
}
