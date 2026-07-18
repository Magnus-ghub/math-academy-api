import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TeacherCategory, UserAuthType, UserRole, UserStatus } from 'src/libs/enums/user.enum';
import { TestType } from 'src/libs/enums/test.enum';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true, collection: 'users', toObject: { virtuals: true }, toJSON: { virtuals: true } })
export class UserEntity {
  @Prop({ enum: Object.values(UserRole), type: String, default: UserRole.STUDENT })
  userRole: UserRole;

  @Prop({ enum: Object.values(UserStatus), type: String, default: UserStatus.ACTIVE })
  userStatus: UserStatus;

  @Prop({ enum: Object.values(UserAuthType), type: String, required: true })
  userAuthType: UserAuthType;

  @Prop({ type: String, default: null })
  telegramId: string | null;

  @Prop({ type: String, default: null })
  googleId: string | null;

  @Prop({ type: String, default: null })
  userName: string | null;

  @Prop({ type: String, default: null })
  userLastName: string | null;

  @Prop({ type: String, default: null })
  userPhone: string | null;

  @Prop({ type: String, default: null })
  userImage: string | null;

  @Prop({ type: String, default: null })
  userAddress: string | null;

  @Prop({ type: String, default: null })
  userRegion: string | null;

  @Prop({ type: String, default: null })
  userDistrict: string | null;

  @Prop({ type: String, default: null })
  userDesc: string | null;

  @Prop({ type: String, default: null })
  userEmail: string | null;

  @Prop({ type: String, default: null })
  userPassword: string | null;

  @Prop({ type: String, default: null })
  resetPasswordToken: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpires: Date | null;

  @Prop({ type: Date, default: null })
  premiumExpiresAt: Date | null;

  @Prop({ enum: Object.values(TestType), type: String, default: null })
  examPrepType: TestType | null;

  @Prop({ enum: Object.values(TeacherCategory), type: String, default: null })
  teacherCategory: TeacherCategory | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);

UserSchema.index({ telegramId: 1 }, { unique: true, partialFilterExpression: { telegramId: { $type: 'string' } } });
UserSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } });
UserSchema.index({ userEmail: 1 }, { unique: true, partialFilterExpression: { userEmail: { $type: 'string' } } });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ userRole: 1 });
UserSchema.index({ createdAt: -1 });
