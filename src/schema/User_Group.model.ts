import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GroupType } from '../libs/enums/group.enum';

export type UserGroupDocument = HydratedDocument<UserGroupEntity>;

@Schema({
  timestamps: { createdAt: 'joinedAt', updatedAt: false },
  collection: 'user_groups',
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
})
export class UserGroupEntity {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  groupId: string;

  @Prop({ enum: Object.values(GroupType), type: String, required: true })
  groupType: GroupType;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  joinedAt: Date;
}

export const UserGroupSchema = SchemaFactory.createForClass(UserGroupEntity);

UserGroupSchema.index({ userId: 1 });
UserGroupSchema.index({ groupId: 1, userId: 1 });
UserGroupSchema.index({ expiresAt: 1 });
