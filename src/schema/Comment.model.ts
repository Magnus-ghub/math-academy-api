import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CommentStatus, CommentType } from 'src/libs/enums/comment.enum';

export type CommentDocument = HydratedDocument<CommentEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'comments',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class CommentEntity {
  @Prop({ enum: Object.values(CommentType), type: String, required: true })
  commentType: CommentType;

  @Prop({ enum: Object.values(CommentStatus), type: String, default: CommentStatus.PENDING })
  commentStatus: CommentStatus;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Number, default: null })
  rating: number | null;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, default: null })
  testId: string | null;

  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(CommentEntity);

CommentSchema.index({ testId: 1, commentType: 1, commentStatus: 1 });
CommentSchema.index({ commentType: 1, commentStatus: 1, createdAt: -1 });
