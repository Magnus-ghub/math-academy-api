import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentService } from './comment.service';
import { CommentResolver } from './comment.resolver';
import { CommentEntity } from '../../schema/Comment.model';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity])],
  providers: [CommentService, CommentResolver],
  exports: [CommentService],
})
export class CommentModule {}