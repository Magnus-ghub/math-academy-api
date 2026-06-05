import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../../schema/Comment.model';
import { CommentStatus, CommentType } from '../../libs/enums/comment.enum';
import { CommentInput } from 'src/libs/dto/comment/commentInput';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepo: Repository<CommentEntity>,
  ) {}

  async createComment(userId: string, input: CommentInput): Promise<CommentEntity> {
    const comment = this.commentRepo.create({
      ...input,
      userId,
      commentStatus: CommentStatus.PENDING,
    });
    return this.commentRepo.save(comment);
  }

  async getTestComments(testId: string): Promise<CommentEntity[]> {
    return this.commentRepo.find({
      where: { testId, commentType: CommentType.TEST, commentStatus: CommentStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });
  }

  async getPublicComments(): Promise<CommentEntity[]> {
    return this.commentRepo.find({
      where: { commentType: CommentType.GENERAL, commentStatus: CommentStatus.APPROVED },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async approveComment(commentId: string): Promise<CommentEntity> {
    await this.commentRepo.update(commentId, { commentStatus: CommentStatus.APPROVED });
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async rejectComment(commentId: string): Promise<CommentEntity> {
    await this.commentRepo.update(commentId, { commentStatus: CommentStatus.REJECTED });
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async getPendingComments(): Promise<CommentEntity[]> {
    return this.commentRepo.find({
      where: { commentStatus: CommentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }
}