import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { GroupEntity } from '../../schema/Group.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { UserEntity } from '../../schema/User.model';
import { GroupUpdate } from '../../libs/dto/group/groupUpdate';
import { GroupStatus } from '../../libs/enums/group.enum';
import { Cron } from '@nestjs/schedule';
import { GroupInput } from 'src/libs/dto/group/groupInput';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity)
    private groupRepo: Repository<GroupEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  async createGroup(input: GroupInput): Promise<GroupEntity> {
    const group = this.groupRepo.create(input);
    return this.groupRepo.save(group);
  }

  async updateGroup(groupId: string, input: GroupUpdate): Promise<GroupEntity> {
    await this.groupRepo.update(groupId, { ...input });
    return this.getGroupById(groupId);
  }

  async getGroupById(groupId: string): Promise<GroupEntity> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async getAllGroups(): Promise<GroupEntity[]> {
    return this.groupRepo.find({
      where: { groupStatus: GroupStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async getMyGroups(userId: string): Promise<(UserGroupEntity & { groupName: string })[]> {
    const userGroups = await this.userGroupRepo.find({
      where: { userId },
      order: { joinedAt: 'DESC' },
    });
    if (userGroups.length === 0) return [];

    const activeGroups = await this.groupRepo.find({
      where: {
        id: In(userGroups.map((ug) => ug.groupId)),
        groupStatus: GroupStatus.ACTIVE,
      },
      select: { id: true, groupName: true },
    });
    const activeMap = new Map(activeGroups.map((g) => [g.id, g.groupName]));
    return userGroups
      .filter((ug) => activeMap.has(ug.groupId))
      .map((ug) => Object.assign(ug, { groupName: activeMap.get(ug.groupId)! }));
  }

  async getUsersByGroup(groupId: string): Promise<UserGroupEntity[]> {
    return this.userGroupRepo.find({ where: { groupId } });
  }

  async getGroupMemberIds(groupId: string): Promise<string[]> {
    const rows = await this.userGroupRepo.find({
      where: { groupId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<UserGroupEntity> {
    const group = await this.getGroupById(groupId);

    const existing = await this.userGroupRepo.findOne({ where: { groupId, userId } });
    if (existing) return existing;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + group.durationMonths);

    const entry = this.userGroupRepo.create({
      userId,
      groupId,
      groupType: group.groupType,
      expiresAt,
    });
    const saved = await this.userGroupRepo.save(entry);
    await this.groupRepo.increment({ id: groupId }, 'memberCount', 1);
    return saved;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
    const entry = await this.userGroupRepo.findOne({ where: { groupId, userId } });
    if (!entry) return false;
    await this.userGroupRepo.remove(entry);
    const realCount = await this.userGroupRepo.count({ where: { groupId } });
    await this.groupRepo.update(groupId, { memberCount: realCount });
    return true;
  }

  async getGroupMembers(groupId: string): Promise<Array<UserEntity & { expiresAt: Date; joinedAt: Date }>> {
    const userGroups = await this.userGroupRepo.find({
      where: { groupId },
      order: { joinedAt: 'DESC' },
    });
    if (userGroups.length === 0) return [];

    const users = await this.userRepo.find({
      where: { id: In(userGroups.map((ug) => ug.userId)) },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return userGroups
      .filter((ug) => userMap.has(ug.userId))
      .map((ug) =>
        Object.assign(Object.create(userMap.get(ug.userId)!), userMap.get(ug.userId), {
          expiresAt: ug.expiresAt,
          joinedAt: ug.joinedAt,
        }),
      );
  }

  async getMemberCount(groupId: string): Promise<number> {
    return this.userGroupRepo.count({ where: { groupId } });
  }

  // Muddati o'tgan user_groups ni har kecha tozalash
  @Cron('0 0 * * *')
  async expireUserGroups() {
    const expired = await this.userGroupRepo.find({
      where: { expiresAt: LessThan(new Date()) },
    });

    if (expired.length > 0) {
      await this.userGroupRepo.remove(expired);
      console.log(`Expired ${expired.length} user_groups`);
    }
  }
}