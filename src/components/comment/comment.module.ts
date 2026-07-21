import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentService } from './comment.service';
import { CommentResolver } from './comment.resolver';
import { CommentEntity, CommentSchema } from '../../schema/Comment.model';
import { UserEntity, UserSchema } from '../../schema/User.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommentEntity.name, schema: CommentSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
  ],
  providers: [CommentService, CommentResolver],
  exports: [CommentService],
})
export class CommentModule {}
