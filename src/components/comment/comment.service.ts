import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentEntity, CommentDocument } from '../../schema/Comment.model';
import { CommentStatus, CommentType } from '../../libs/enums/comment.enum';
import { CommentInput } from 'src/libs/dto/comment/commentInput';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(CommentEntity.name)
    private commentModel: Model<CommentDocument>,
  ) {}

  async createComment(userId: string, input: CommentInput): Promise<CommentDocument> {
    return this.commentModel.create({
      ...input,
      userId,
      commentStatus: CommentStatus.PENDING,
    });
  }

  async getTestComments(testId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ testId, commentType: CommentType.TEST, commentStatus: CommentStatus.APPROVED })
      .sort({ createdAt: -1 });
  }

  async getPublicComments(): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ commentType: CommentType.GENERAL, commentStatus: CommentStatus.APPROVED })
      .sort({ createdAt: -1 })
      .limit(20);
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

  async getPendingComments(): Promise<CommentDocument[]> {
    return this.commentModel.find({ commentStatus: CommentStatus.PENDING }).sort({ createdAt: -1 });
  }
}
