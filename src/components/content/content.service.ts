import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContentEntity } from '../../schema/Content.model';
import { GroupEntity } from '../../schema/Group.model';
import { UserGroupEntity } from '../../schema/User_Group.model';
import { ContentInput } from '../../libs/dto/content/contentInput';
import { ContentUpdate } from '../../libs/dto/content/contentUpdate';
import { ContentStatus, ContentType } from '../../libs/enums/content.enum';
import { GroupStatus } from '../../libs/enums/group.enum';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentEntity)
    private contentRepo: Repository<ContentEntity>,

    @InjectRepository(GroupEntity)
    private groupRepo: Repository<GroupEntity>,

    @InjectRepository(UserGroupEntity)
    private userGroupRepo: Repository<UserGroupEntity>,
  ) {}

  async createContent(input: ContentInput, createdBy: string): Promise<ContentEntity> {
    const content = this.contentRepo.create({ ...input, createdBy });
    return this.contentRepo.save(content);
  }

  async updateContent(contentId: string, input: ContentUpdate): Promise<ContentEntity> {
    await this.contentRepo.update(contentId, { ...input });
    return this.getContentById(contentId);
  }

  async getContentById(contentId: string): Promise<ContentEntity> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async getPublishedByType(contentType: ContentType): Promise<ContentEntity[]> {
    return this.contentRepo.find({
      where: { contentType, contentStatus: ContentStatus.PUBLISHED },
      order: { publishedAt: 'DESC' },
    });
  }

  async getSuccessStories(): Promise<ContentEntity[]> {
    return this.getPublishedByType(ContentType.SUCCESS_STORY);
  }

  async getTeachers(): Promise<ContentEntity[]> {
    return this.getPublishedByType(ContentType.TEACHER);
  }

  async getEvents(): Promise<ContentEntity[]> {
    return this.getPublishedByType(ContentType.EVENT);
  }

  async getFaqs(): Promise<ContentEntity[]> {
    return this.contentRepo.find({
      where: { contentType: ContentType.FAQ, contentStatus: ContentStatus.PUBLISHED },
      order: { createdAt: 'ASC' },
    });
  }

  async getBook(): Promise<ContentEntity | null> {
    return this.contentRepo.findOne({
      where: { contentType: ContentType.BOOK },
      order: { updatedAt: 'DESC' },
    });
  }

  async incrementView(contentId: string): Promise<void> {
    await this.contentRepo.increment({ id: contentId }, 'viewCount', 1);
  }

  async getActiveUserGroups(userId: string): Promise<UserGroupEntity[]> {
    const userGroups = await this.userGroupRepo.find({ where: { userId } });
    if (userGroups.length === 0) return [];
    const activeGroups = await this.groupRepo.find({
      where: {
        id: In(userGroups.map((ug) => ug.groupId)),
        groupStatus: GroupStatus.ACTIVE,
      },
      select: { id: true },
    });
    const activeIds = new Set(activeGroups.map((g) => g.id));
    return userGroups.filter((ug) => activeIds.has(ug.groupId));
  }

  async getGroupMaterials(groupId: string): Promise<ContentEntity[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group || group.groupStatus !== GroupStatus.ACTIVE) {
      throw new ForbiddenException('Guruh faol emas yoki mavjud emas');
    }
    return this.contentRepo.find({
      where: { groupId, contentType: ContentType.LESSON, contentStatus: ContentStatus.PUBLISHED },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllContent(): Promise<ContentEntity[]> {
    return this.contentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async deleteContent(contentId: string): Promise<boolean> {
    const content = await this.getContentById(contentId);
    await this.contentRepo.remove(content);
    return true;
  }
}