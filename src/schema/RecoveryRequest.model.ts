import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RecoveryStatus } from '../libs/enums/recovery.enum';

export type RecoveryRequestDocument = HydratedDocument<RecoveryRequestEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'recovery_requests',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class RecoveryRequestEntity {
  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, default: null })
  telegramUsername: string | null;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ enum: Object.values(RecoveryStatus), type: String, default: RecoveryStatus.PENDING })
  status: RecoveryStatus;

  createdAt: Date;
}

export const RecoveryRequestSchema = SchemaFactory.createForClass(RecoveryRequestEntity);

RecoveryRequestSchema.index({ status: 1, createdAt: -1 });
