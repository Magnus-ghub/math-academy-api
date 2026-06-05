import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentInput } from 'src/libs/dto/comment/commentInput';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../libs/enums/user.enum';
import { Comment } from '../../libs/dto/comment/comment';

@Resolver(() => Comment)
export class CommentResolver {
  constructor(private commentService: CommentService) {}

  @Query(() => [Comment])
  async getTestComments(@Args('testId') testId: string) {
    return this.commentService.getTestComments(testId);
  }

  @Query(() => [Comment])
  async getPublicComments() {
    return this.commentService.getPublicComments();
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Comment)
  async createComment(
    @CurrentUser() user: any,
    @Args('input') input: CommentInput,
  ) {
    return this.commentService.createComment(user.userId, input);
  }

  // ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Query(() => [Comment])
  async getPendingComments() {
    return this.commentService.getPendingComments();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Comment)
  async approveComment(@Args('commentId') commentId: string) {
    return this.commentService.approveComment(commentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Mutation(() => Comment)
  async rejectComment(@Args('commentId') commentId: string) {
    return this.commentService.rejectComment(commentId);
  }
}