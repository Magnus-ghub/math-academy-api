import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { GroupEntity } from '../../schema/Group.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
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

  async getUsersByGroup(groupId: string): Promise<UserGroupEntity[]> {
    return this.userGroupRepo.find({ where: { groupId } });
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