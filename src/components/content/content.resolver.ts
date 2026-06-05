import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { Content } from '../../libs/dto/content/content';
import { ContentInput } from '../../libs/dto/content/contentInput';
import { ContentUpdate } from '../../libs/dto/content/contentUpdate';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { ContentType } from '../../libs/enums/content.enum';

@Resolver(() => Content)
export class ContentResolver {
  constructor(private contentService: ContentService) {}

  // Public
  @Query(() => [Content])
  async getSuccessStories() {
    return this.contentService.getSuccessStories();
  }

  @Query(() => [Content])
  async getTeachers() {
    return this.contentService.getTeachers();
  }

  @Query(() => [Content])
  async getEvents() {
    return this.contentService.getEvents();
  }

  @Query(() => Content)
  async getContent(@Args('contentId') contentId: string) {
    await this.contentService.incrementView(contentId);
    return this.contentService.getContentById(contentId);
  }

  // ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Content)
  async createContent(
    @CurrentUser() user: any,
    @Args('input') input: ContentInput,
  ) {
    return this.contentService.createContent(input, user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Content)
  async updateContent(
    @Args('contentId') contentId: string,
    @Args('input') input: ContentUpdate,
  ) {
    return this.contentService.updateContent(contentId, input);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Content])
  async getAllContent() {
    return this.contentService.getAllContent();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Boolean)
  async deleteContent(@Args('contentId') contentId: string) {
    return this.contentService.deleteContent(contentId);
  }
}