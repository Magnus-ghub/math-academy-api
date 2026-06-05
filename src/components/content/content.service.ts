import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEntity } from '../../schema/Content.model';
import { ContentInput } from '../../libs/dto/content/contentInput';
import { ContentUpdate } from '../../libs/dto/content/contentUpdate';
import { ContentStatus, ContentType } from '../../libs/enums/content.enum';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentEntity)
    private contentRepo: Repository<ContentEntity>,
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

  async incrementView(contentId: string): Promise<void> {
    await this.contentRepo.increment({ id: contentId }, 'viewCount', 1);
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