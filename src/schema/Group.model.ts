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

  // Muddat ikki usulda beriladi — bittasi to'ldiriladi, ikkinchisi null:
  // durationMonths — har bir a'zo qo'shilgan paytdan boshlab N oy;
  // endDate — kurs tugaydigan aniq sana, barcha a'zolar uchun bir xil.
  @Prop({ type: Number, default: null })
  durationMonths: number | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: String, default: null })
  groupDesc: string | null;

  // Bazada yangilanmaydi — GroupsService.getAllGroups'da user_groups'dan hisoblanadi
  @Prop({ type: Number, default: 0 })
  memberCount: number;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const GroupSchema = SchemaFactory.createForClass(GroupEntity);

GroupSchema.index({ groupStatus: 1, createdAt: -1 });
