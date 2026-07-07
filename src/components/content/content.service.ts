import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentEntity, ContentDocument } from '../../schema/Content.model';
import { GroupEntity, GroupDocument } from '../../schema/Group.model';
import { UserGroupEntity, UserGroupDocument } from '../../schema/User_Group.model';
import { ContentInput } from '../../libs/dto/content/contentInput';
import { ContentUpdate } from '../../libs/dto/content/contentUpdate';
import { ContentStatus, ContentType } from '../../libs/enums/content.enum';
import { GroupStatus } from '../../libs/enums/group.enum';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(ContentEntity.name)
    private contentModel: Model<ContentDocument>,

    @InjectModel(GroupEntity.name)
    private groupModel: Model<GroupDocument>,

    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {}

  async createContent(input: ContentInput, createdBy: string): Promise<ContentDocument> {
    return this.contentModel.create({ ...input, createdBy });
  }

  async updateContent(contentId: string, input: ContentUpdate): Promise<ContentDocument> {
    await this.contentModel.updateOne({ _id: contentId }, { $set: { ...input } });
    return this.getContentById(contentId);
  }

  async getContentById(contentId: string): Promise<ContentDocument> {
    const content = await this.contentModel.findById(contentId);
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async getPublishedByType(contentType: ContentType): Promise<ContentDocument[]> {
    return this.contentModel
      .find({ contentType, contentStatus: ContentStatus.PUBLISHED })
      .sort({ publishedAt: -1 });
  }

  async getSuccessStories(): Promise<ContentDocument[]> {
    return this.getPublishedByType(ContentType.SUCCESS_STORY);
  }

  async getTeachers(): Promise<ContentDocument[]> {
    return this.getPublishedByType(ContentType.TEACHER);
  }

  async getEvents(): Promise<ContentDocument[]> {
    return this.getPublishedByType(ContentType.EVENT);
  }

  async getFaqs(): Promise<ContentDocument[]> {
    return this.contentModel
      .find({ contentType: ContentType.FAQ, contentStatus: ContentStatus.PUBLISHED })
      .sort({ createdAt: 1 });
  }

  async getBook(): Promise<ContentDocument | null> {
    return this.contentModel.findOne({ contentType: ContentType.BOOK }).sort({ updatedAt: -1 });
  }

  async incrementView(contentId: string): Promise<void> {
    await this.contentModel.updateOne({ _id: contentId }, { $inc: { viewCount: 1 } });
  }

  async getActiveUserGroups(userId: string): Promise<UserGroupDocument[]> {
    const userGroups = await this.userGroupModel.find({ userId });
    if (userGroups.length === 0) return [];
    const activeGroups = await this.groupModel.find(
      { _id: { $in: userGroups.map((ug) => ug.groupId) }, groupStatus: GroupStatus.ACTIVE },
      '_id',
    );
    const activeIds = new Set(activeGroups.map((g) => g.id));
    return userGroups.filter((ug) => activeIds.has(ug.groupId));
  }

  async getGroupMaterials(groupId: string): Promise<ContentDocument[]> {
    const group = await this.groupModel.findById(groupId);
    if (!group || group.groupStatus !== GroupStatus.ACTIVE) {
      throw new ForbiddenException('Guruh faol emas yoki mavjud emas');
    }
    return this.contentModel
      .find({ groupId, contentType: ContentType.LESSON, contentStatus: ContentStatus.PUBLISHED })
      .sort({ createdAt: -1 });
  }

  async getAllContent(): Promise<ContentDocument[]> {
    return this.contentModel.find().sort({ createdAt: -1 });
  }

  async deleteContent(contentId: string): Promise<boolean> {
    const content = await this.getContentById(contentId);
    await this.contentModel.deleteOne({ _id: content._id });
    return true;
  }
}
