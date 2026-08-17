import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NotificationType } from '../libs/enums/notification.enum';

export type NotificationDocument = HydratedDocument<NotificationEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'notifications',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class NotificationEntity {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ enum: Object.values(NotificationType), type: String, required: true })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  // Bosilganda talaba yo'naltiriladigan frontend yo'li (masalan /dashboard/tests)
  @Prop({ type: String, default: null })
  link: string | null;

  @Prop({ type: String, default: null })
  testId: string | null;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationEntity);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
