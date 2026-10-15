import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import type { MessageEntity } from 'telegraf/types';
import {
  BroadcastAudience,
  BroadcastMediaType,
  BroadcastStatus,
} from '../libs/enums/broadcast.enum';

export type BroadcastDocument = HydratedDocument<BroadcastEntity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'broadcasts',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class BroadcastEntity {
  // Media bo'lsa — uning izohi (caption), bo'lmasa xabar matni
  @Prop({ type: String, default: '' })
  message: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  entities: MessageEntity[] | null;

  @Prop({
    enum: [...Object.values(BroadcastMediaType), null],
    type: String,
    default: null,
  })
  mediaType: BroadcastMediaType | null;

  // Telegram serveridagi fayl ID si — bir marta yuklanib, hammaga qayta ishlatiladi
  @Prop({ type: String, default: null })
  mediaFileId: string | null;

  @Prop({
    enum: Object.values(BroadcastAudience),
    type: String,
    required: true,
  })
  audience: BroadcastAudience;

  @Prop({ type: String, default: null })
  groupId: string | null;

  @Prop({ type: String, default: null })
  groupName: string | null;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ type: Number, default: 0 })
  sent: number;

  @Prop({ type: Number, default: 0 })
  failed: number;

  @Prop({
    enum: Object.values(BroadcastStatus),
    type: String,
    default: BroadcastStatus.SENDING,
  })
  status: BroadcastStatus;

  @Prop({ type: Date, default: null })
  finishedAt: Date | null;

  createdAt: Date;
}

export const BroadcastSchema = SchemaFactory.createForClass(BroadcastEntity);

BroadcastSchema.index({ createdAt: -1 });
BroadcastSchema.index({ status: 1 });
