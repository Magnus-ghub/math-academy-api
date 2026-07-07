import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GroupType, GroupStatus } from '../libs/enums/group.enum';

export type GroupDocument = HydratedDocument<GroupEntity>;

@Schema({ timestamps: true, collection: 'groups', toObject: { virtuals: true }, toJSON: { virtuals: true } })
export class GroupEntity {
  @Prop({ enum: Object.values(GroupType), type: String, required: true })
  groupType: GroupType;

  @Prop({ enum: Object.values(GroupStatus), type: String, default: GroupStatus.ACTIVE })
  groupStatus: GroupStatus;

  @Prop({ type: String, required: true })
  groupName: string;

  @Prop({ type: String, required: true, unique: true })
  telegramChatId: string;

  @Prop({ type: Number, required: true })
  durationMonths: number;

  @Prop({ type: String, default: null })
  groupDesc: string | null;

  @Prop({ type: Number, default: 0 })
  memberCount: number;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const GroupSchema = SchemaFactory.createForClass(GroupEntity);

GroupSchema.index({ groupStatus: 1, createdAt: -1 });
