import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentEntity, CommentDocument } from '../../schema/Comment.model';
import { UserEntity, UserDocument } from '../../schema/User.model';
import { CommentStatus, CommentType } from '../../libs/enums/comment.enum';
import { CommentInput } from 'src/libs/dto/comment/commentInput';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(CommentEntity.name)
    private commentModel: Model<CommentDocument>,

    @InjectModel(UserEntity.name)
    private userModel: Model<UserDocument>,
  ) {}

  private async withUserInfo(comments: CommentDocument[]): Promise<any[]> {
    if (comments.length === 0) return [];
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = await this.userModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return comments.map((c) => {
      const user = userMap.get(c.userId);
      const parts = [user?.userName, user?.userLastName].filter(Boolean);
      return {
        ...c.toObject(),
        userName: parts.length > 0 ? parts.join(' ') : 'Foydalanuvchi',
        userImage: user?.userImage ?? undefined,
      };
    });
  }

  async createComment(userId: string, input: CommentInput): Promise<CommentDocument> {
    return this.commentModel.create({
      ...input,
      userId,
      commentStatus: CommentStatus.PENDING,
    });
  }

  async getTestComments(testId: string): Promise<any[]> {
    const comments = await this.commentModel
      .find({ testId, commentType: CommentType.TEST, commentStatus: CommentStatus.APPROVED })
      .sort({ createdAt: -1 });
    return this.withUserInfo(comments);
  }

  async getPublicComments(): Promise<any[]> {
    const comments = await this.commentModel
      .find({ commentType: CommentType.GENERAL, commentStatus: CommentStatus.APPROVED })
      .sort({ createdAt: -1 })
      .limit(20);
    return this.withUserInfo(comments);
  }

  async approveComment(commentId: string): Promise<CommentDocument> {
    const comment = await this.commentModel.findByIdAndUpdate(
      commentId,
      { $set: { commentStatus: CommentStatus.APPROVED } },
      { new: true },
    );
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async rejectComment(commentId: string): Promise<CommentDocument> {
    const comment = await this.commentModel.findByIdAndUpdate(
      commentId,
      { $set: { commentStatus: CommentStatus.REJECTED } },
      { new: true },
    );
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async getPendingComments(): Promise<any[]> {
    const comments = await this.commentModel.find({ commentStatus: CommentStatus.PENDING }).sort({ createdAt: -1 });
    return this.withUserInfo(comments);
  }

  async getAllComments(): Promise<any[]> {
    const comments = await this.commentModel.find().sort({ createdAt: -1 });
    return this.withUserInfo(comments);
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const result = await this.commentModel.deleteOne({ _id: commentId });
    if (result.deletedCount === 0) throw new NotFoundException('Comment not found');
    return true;
  }
}
