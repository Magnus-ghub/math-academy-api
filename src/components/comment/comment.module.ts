import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentService } from './comment.service';
import { CommentResolver } from './comment.resolver';
import { CommentEntity, CommentSchema } from '../../schema/Comment.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: CommentEntity.name, schema: CommentSchema }])],
  providers: [CommentService, CommentResolver],
  exports: [CommentService],
})
export class CommentModule {}
