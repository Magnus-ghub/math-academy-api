import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ContentType, ContentStatus } from '../libs/enums/content.enum';

export type ContentDocument = HydratedDocument<ContentEntity>;

@Schema({ timestamps: true, collection: 'contents', toObject: { virtuals: true }, toJSON: { virtuals: true } })
export class ContentEntity {
  @Prop({ enum: Object.values(ContentType), type: String, required: true })
  contentType: ContentType;

  @Prop({ enum: Object.values(ContentStatus), type: String, default: ContentStatus.DRAFT })
  contentStatus: ContentStatus;

  @Prop({ type: String, required: true })
  contentTitle: string;

  @Prop({ type: String, default: null })
  contentDesc: string | null;

  @Prop({ type: String, default: null })
  contentImage: string | null;

  @Prop({ type: String, default: null })
  contentVideo: string | null;

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: String, default: null })
  groupId: string | null;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: String, default: null })
  metaJson: string | null;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ContentSchema = SchemaFactory.createForClass(ContentEntity);

ContentSchema.index({ contentType: 1, contentStatus: 1, publishedAt: -1 });
ContentSchema.index({ groupId: 1, contentType: 1, contentStatus: 1 });
